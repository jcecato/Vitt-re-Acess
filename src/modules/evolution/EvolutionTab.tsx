import React, { useState, useEffect, useMemo } from 'react';
import {
  PatientProfile,
  CheckinQuestionItem,
  LongitudinalNeedRow,
  MapaGeralPoint
} from '../../types/patient';
import { X, CheckCircle2, Calendar, CloudCheck, RefreshCw } from 'lucide-react';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { crmDataService, normalizeWellbeingData } from '../../services/crmDataService';

interface EvolutionTabProps {
  patient: PatientProfile;
}

export type PgiAnswerKey = 'pior' | 'igual' | 'pouco' | 'muito' | 'sem';

export interface MapaGeralStateMeta {
  key: 'base' | PgiAnswerKey | 'misto';
  label: string;
  word: string;
  sym: string;
  cls: string;
  band: string;
  val: number;
  color: string;
}

// B. Tabela Oficial de Estados, Cores e Faixas (MAPA_GERAL_ST — Mapa Geral v7)
export const MAPA_GERAL_ST: Record<'base' | PgiAnswerKey | 'misto', MapaGeralStateMeta> = {
  base: {
    key: 'base',
    label: 'Base (início)',
    word: 'Base',
    sym: '·',
    cls: 'flat',
    band: 'referência 0%',
    val: 0,
    color: '#93a4bd'
  },
  pior: {
    key: 'pior',
    label: 'Pior',
    word: 'Atenção',
    sym: '↘',
    cls: 'bad',
    band: '−20% ou pior',
    val: -30,
    color: '#ff4757'
  },
  igual: {
    key: 'igual',
    label: 'Igual',
    word: 'Estável',
    sym: '↔',
    cls: 'flat',
    band: '−19% a +19%',
    val: 0,
    color: '#93a4bd'
  },
  pouco: {
    key: 'pouco',
    label: 'Um pouco melhor',
    word: 'Melhora Parcial',
    sym: '↗',
    cls: 'good',
    band: '+20% a +49%',
    val: 35,
    color: '#2dd36f'
  },
  muito: {
    key: 'muito',
    label: 'Muito melhor',
    word: 'Melhora Importante',
    sym: '↑',
    cls: 'good2',
    band: '+50% a +99%',
    val: 75,
    color: '#57e389'
  },
  sem: {
    key: 'sem',
    label: 'Sem o sintoma',
    word: 'Remissão',
    sym: '🏆',
    cls: 'meta',
    band: '100%',
    val: 100,
    color: '#fcd34d'
  },
  misto: {
    key: 'misto',
    label: 'Misto',
    word: 'MISTO',
    sym: '◐',
    cls: 'mist',
    band: 'divergência entre sintomas',
    val: 0,
    color: '#fb923c'
  }
};

export const OFFICIAL_V7_OPTIONS: MapaGeralStateMeta[] = [
  MAPA_GERAL_ST.pior,
  MAPA_GERAL_ST.igual,
  MAPA_GERAL_ST.pouco,
  MAPA_GERAL_ST.muito,
  MAPA_GERAL_ST.sem
];

const VALID_PGI_KEYS = new Set<string>(['pior', 'igual', 'pouco', 'muito', 'sem']);

interface CheckinFirestoreDoc {
  id: string;
  patientEmail: string;
  createdAt: string;
  dateStr: string;
  dayLabel: string;
  mode: string;
  source: string;
  answers: Record<string, string>;
  questionLabels: Record<string, string>;
  exactMean?: number;
  averagePercent?: number;
  ivp?: number;
}

interface PointDetailModalState {
  symptomLabel: string;
  stageLabel: 'Avaliação Inicial' | 'Avaliação Atual';
  point: MapaGeralPoint;
}

function normalizeTextKey(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function toShortDateBr(dateInput?: string): string {
  if (!dateInput) return '—';
  const clean = dateInput.trim();
  const brMatch = clean.match(/^(\d{2})\/(\d{2})(?:\/(\d{4}))?/);
  if (brMatch) {
    return `${brMatch[1]}/${brMatch[2]}`;
  }
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}`;
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}`;
  }
  return clean.slice(0, 5) || '—';
}

function toFullDateBr(dateInput?: string): string {
  if (!dateInput) return '—';
  const clean = dateInput.trim();
  const brFullMatch = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brFullMatch) {
    return `${brFullMatch[1]}/${brFullMatch[2]}/${brFullMatch[3]}`;
  }
  const isoMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }
  return clean;
}

function mapLegacyOrV7AnswerKey(rawKey?: string): PgiAnswerKey | null {
  if (!rawKey) return null;
  const k = rawKey.trim().toLowerCase();
  if (VALID_PGI_KEYS.has(k)) return k as PgiAnswerKey;
  if (k === 'declinio') return 'pior';
  if (k === 'estavel') return 'igual';
  if (k === 'em_melhora') return 'pouco';
  if (k === 'recuperado_100') return 'sem';
  return null;
}

function bandOfMean(I: number): PgiAnswerKey {
  if (I >= 95) return 'sem';
  if (I >= 50) return 'muito';
  if (I >= 20) return 'pouco';
  if (I <= -20) return 'pior';
  return 'igual';
}

// Fórmula oficial da altura Y de cada ponto no InitialVsCurrentSparkline
function calcSparklineY(v: number): number {
  return 5 + ((110 - Math.max(-40, Math.min(110, v))) / 150) * 24;
}

export const EvolutionTab: React.FC<EvolutionTabProps> = ({ patient }) => {
  const targetPatientEmail = (patient.email && patient.email.includes('@'))
    ? patient.email.trim().toLowerCase()
    : (patient.id && patient.id.includes('@') ? patient.id.trim().toLowerCase() : 'jcecato@gmail.com');

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Estado lido diretamente de /patients/{email}/evolution/resumo_geral
  const [liveResumoWellbeing, setLiveResumoWellbeing] = useState<
    ReturnType<typeof normalizeWellbeingData>
  >(patient.wellbeingData || null);

  // Documentos de /patients/{email}/checkins ordenados por createdAt ASC (mais antigo -> mais recente)
  const [checkinsAsc, setCheckinsAsc] = useState<CheckinFirestoreDoc[]>([]);
  const [submittedConfirmation, setSubmittedConfirmation] = useState<boolean>(false);

  // Modo de visualização da tabela (Botão 1: "compare" ativo por padrão | Botão 2: "current")
  const [viewMode, setViewMode] = useState<'compare' | 'current'>('compare');

  // Modal de detalhe de ponto do gráfico
  const [selectedPointDetail, setSelectedPointDetail] = useState<PointDetailModalState | null>(null);

  // Modal dinâmico de Check-in
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, PgiAnswerKey>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sincronização sob demanda
  useEffect(() => {
    crmDataService.refreshClinicalEvolutions(targetPatientEmail);
  }, [targetPatientEmail]);

  // 1. Leitura Principal em Tempo Real: onSnapshot em /patients/{email}/evolution/resumo_geral
  useEffect(() => {
    if (!isFirebaseConfigured() || !db) return;

    try {
      const resumoRef = doc(db, 'patients', targetPatientEmail, 'evolution', 'resumo_geral');
      const unsubscribeResumo = onSnapshot(
        resumoRef,
        (docSnap) => {
          setIsCloudSynced(true);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const normalized = normalizeWellbeingData(data);
            setLiveResumoWellbeing(normalized);
          } else {
            // Se resumo_geral foi apagado, nunca usa campos legados da raiz
            setLiveResumoWellbeing(null);
          }
        },
        (err) => {
          console.info('🔒 [Vittáre Mapa Geral v7] evolution/resumo_geral em modo seguro:', err?.code);
        }
      );

      return () => unsubscribeResumo();
    } catch (e) {
      console.warn('Falha ao ouvir evolution/resumo_geral:', e);
    }
  }, [targetPatientEmail]);

  // 2. Leitura Complementar em Tempo Real: onSnapshot em /patients/{email}/checkins (ordenados por createdAt ASC)
  useEffect(() => {
    if (!isFirebaseConfigured() || !db) return;

    try {
      const colRef = collection(db, 'patients', targetPatientEmail, 'checkins');

      const unsubscribeCheckins = onSnapshot(
        colRef,
        (snapshot) => {
          setIsCloudSynced(true);
          const docs: CheckinFirestoreDoc[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.answers && typeof data.answers === 'object') {
              docs.push({
                id: docSnap.id,
                patientEmail: String(data.patientEmail || targetPatientEmail).toLowerCase(),
                createdAt: String(data.createdAt || ''),
                dateStr: String(data.dateStr || ''),
                dayLabel: String(data.dayLabel || ''),
                mode: String(data.mode || 'dynamic_tags'),
                source: String(data.source || 'patient_app'),
                answers: data.answers as Record<string, string>,
                questionLabels: (data.questionLabels as Record<string, string>) || {},
                exactMean: typeof data.exactMean === 'number' ? data.exactMean : undefined,
                averagePercent: typeof data.averagePercent === 'number' ? data.averagePercent : undefined,
                ivp: typeof data.ivp === 'number' ? data.ivp : undefined
              });
            }
          });

          // Ordena estritamente por createdAt ASC (do mais antigo ao mais recente)
          docs.sort((a, b) => {
            const tA = Date.parse(a.createdAt) || 0;
            const tB = Date.parse(b.createdAt) || 0;
            if (tA !== tB) return tA - tB;
            return a.id.localeCompare(b.id);
          });

          setCheckinsAsc(docs);
          if (docs.length === 0) {
            setSubmittedConfirmation(false);
          }
        },
        (err) => {
          console.info('🔒 [Vittáre Check-in v7] Subcoleção checkins em modo seguro:', err?.code);
        }
      );

      return () => unsubscribeCheckins();
    } catch (e) {
      console.warn('Falha ao inicializar listener de checkins:', e);
    }
  }, [targetPatientEmail]);

  const effectiveWellbeing = liveResumoWellbeing ?? patient.wellbeingData ?? null;

  // Lista de perguntas ativas geradas pelo CRM
  const activeQuestions: CheckinQuestionItem[] = useMemo(() => {
    const rawQuestions = effectiveWellbeing?.activeCheckinQuestions || [];
    if (rawQuestions.length > 0) {
      return rawQuestions;
    }
    // Caso needsMatrix exista em resumo_geral sem activeCheckinQuestions explícito, deriva as perguntas ativas
    const fallbackMatrix = effectiveWellbeing?.needsMatrix || [];
    return fallbackMatrix.map((row) => ({
      id: row.id || row.tagId,
      tagId: row.tagId || row.id || row.label,
      label: row.label,
      questionText: `Desde o início do acompanhamento, como está "${row.label}"?`,
      anchorQuestion: 'Desde o início do acompanhamento, como está o sintoma?',
      anchorSubtext: 'considere as últimas 4 semanas',
      startDate: row.startDate
    }));
  }, [effectiveWellbeing]);

  // 3. Reconciliação Imediata no Frontend do App Access (Quem Calcula: Mapa Geral v7)
  const { reconciledRows, reconciledOverall } = useMemo(() => {
    const baseMatrix = effectiveWellbeing?.needsMatrix || [];
    const questionsByTag = new Map<string, CheckinQuestionItem>();
    activeQuestions.forEach((q) => {
      questionsByTag.set(q.tagId, q);
      questionsByTag.set(q.id, q);
    });

    // Garante que todos os sintomas ativos de needsMatrix (ou activeCheckinQuestions) sejam reconciliados
    const sourceRows: LongitudinalNeedRow[] =
      baseMatrix.length > 0
        ? baseMatrix
        : activeQuestions.map((q) => ({
            id: q.id || q.tagId,
            tagId: q.tagId || q.id,
            label: q.label,
            startDate: q.startDate,
            awaitingFirstEvaluation: true,
            statusLabel: '— sem resposta'
          }));

    const rows: LongitudinalNeedRow[] = sourceRows.map((row) => {
      const tagId = row.tagId || row.id || row.label;
      const matchedQ = questionsByTag.get(tagId) || questionsByTag.get(row.id || '');
      const startDate =
        row.startDate ||
        matchedQ?.startDate ||
        row.initialPoint?.date ||
        row.startDateBr ||
        '';
      const startDateShortBr = toShortDateBr(row.startDateBr || startDate);
      const startDateFullBr = toFullDateBr(row.startDateBr || startDate);

      // Avaliação Inicial (initialPoint) sempre fixa em Base (0%)
      const initialPoint: MapaGeralPoint = {
        key: 'base',
        optionLabel: 'Base (início)',
        word: 'Base',
        sym: '·',
        cls: 'flat',
        color: '#93a4bd',
        band: 'referência 0%',
        val: 0,
        date: startDate,
        dateBr: startDateFullBr,
        shortDateBr: startDateShortBr
      };

      const normalizedRowLabel = normalizeTextKey(row.label);

      // Busca todas as respostas válidas em /patients/{email}/checkins (em ordem cronológica ASC)
      const validResponsesAsc: {
        answerKey: PgiAnswerKey;
        checkin: CheckinFirestoreDoc;
      }[] = [];

      checkinsAsc.forEach((chk) => {
        let rawAns: string | undefined = chk.answers?.[tagId] ?? chk.answers?.[row.id || ''];

        // Fallback: busca por label normalizado sem acentos caso o ID da tag tenha mudado
        if (!rawAns && normalizedRowLabel) {
          for (const [ansKey, ansVal] of Object.entries(chk.answers || {})) {
            const qLabel = chk.questionLabels?.[ansKey];
            if (
              normalizeTextKey(ansKey) === normalizedRowLabel ||
              (qLabel && normalizeTextKey(qLabel) === normalizedRowLabel)
            ) {
              rawAns = ansVal;
              break;
            }
          }
        }

        const mappedKey = mapLegacyOrV7AnswerKey(rawAns);
        if (mappedKey) {
          validResponsesAsc.push({ answerKey: mappedKey, checkin: chk });
        }
      });

      // Caso não existam documentos em /checkins para este sintoma:
      if (validResponsesAsc.length === 0) {
        // Se houver checkins na subcoleção, mas nenhum para este sintoma, ou se a subcoleção estiver vazia,
        // respeita eventual currentPoint já consolidado em resumo_geral apenas se checkinsAsc estiver vazio e resumo_geral já tiver currentPoint válido
        const existingCur = row.currentPoint;
        const existingKey = existingCur ? mapLegacyOrV7AnswerKey(String(existingCur.key || row.statusKey || '')) : null;

        if (checkinsAsc.length === 0 && existingCur && existingKey && !row.awaitingFirstEvaluation) {
          const stMeta = MAPA_GERAL_ST[existingKey];
          const curDateRaw = existingCur.date || existingCur.dateBr || '';
          const currentPoint: MapaGeralPoint = {
            key: stMeta.key,
            optionLabel: stMeta.label,
            word: stMeta.word,
            sym: stMeta.sym,
            cls: stMeta.cls,
            color: stMeta.color,
            band: stMeta.band,
            val: stMeta.val,
            date: curDateRaw,
            dateBr: toFullDateBr(curDateRaw),
            shortDateBr: toShortDateBr(curDateRaw)
          };

          return {
            ...row,
            id: row.id || tagId,
            tagId,
            startDate,
            startDateBr: startDateFullBr,
            awaitingFirstEvaluation: false,
            confirmedRemission: Boolean(row.confirmedRemission),
            statusKey: stMeta.key,
            statusWord: stMeta.word,
            statusSym: stMeta.sym,
            statusLabel: `${stMeta.word} ${stMeta.sym}`,
            statusCls: stMeta.cls,
            statusColor: stMeta.color,
            band: stMeta.band,
            val: stMeta.val,
            accumulatedPercent: stMeta.val,
            initialPoint,
            currentPoint,
            initialVsCurrentPoints: [initialPoint, currentPoint]
          };
        }

        return {
          ...row,
          id: row.id || tagId,
          tagId,
          startDate,
          startDateBr: startDateFullBr,
          awaitingFirstEvaluation: true,
          confirmedRemission: false,
          statusKey: 'base',
          statusWord: 'Base',
          statusSym: '·',
          statusLabel: '— sem resposta',
          statusCls: 'flat',
          statusColor: '#93a4bd',
          band: 'referência 0%',
          val: 0,
          accumulatedPercent: 0,
          initialPoint,
          currentPoint: null,
          initialVsCurrentPoints: [initialPoint]
        };
      }

      // Há 1 ou mais check-ins respondidos para o sintoma (pega o mais recente)
      const latestEntry = validResponsesAsc[validResponsesAsc.length - 1];
      const stMeta = MAPA_GERAL_ST[latestEntry.answerKey];
      const latestDateRaw = latestEntry.checkin.dateStr || latestEntry.checkin.createdAt;

      const currentPoint: MapaGeralPoint = {
        key: stMeta.key,
        optionLabel: stMeta.label,
        word: stMeta.word,
        sym: stMeta.sym,
        cls: stMeta.cls,
        color: stMeta.color,
        band: stMeta.band,
        val: stMeta.val,
        date: latestDateRaw,
        dateBr: toFullDateBr(latestDateRaw),
        shortDateBr: toShortDateBr(latestDateRaw)
      };

      // Remissão confirmada se os 2 últimos check-ins daquele sintoma forem "sem"
      const confirmedRemission =
        validResponsesAsc.length >= 2 &&
        validResponsesAsc[validResponsesAsc.length - 1].answerKey === 'sem' &&
        validResponsesAsc[validResponsesAsc.length - 2].answerKey === 'sem';

      return {
        ...row,
        id: row.id || tagId,
        tagId,
        startDate,
        startDateBr: startDateFullBr,
        awaitingFirstEvaluation: false,
        confirmedRemission,
        statusKey: stMeta.key,
        statusWord: stMeta.word,
        statusSym: stMeta.sym,
        statusLabel: `${stMeta.word} ${stMeta.sym}`,
        statusCls: stMeta.cls,
        statusColor: stMeta.color,
        band: stMeta.band,
        val: stMeta.val,
        accumulatedPercent: stMeta.val,
        initialPoint,
        currentPoint,
        initialVsCurrentPoints: [initialPoint, currentPoint]
      };
    });

    // Cálculo da Média Geral + Barra Bipolar + Interpretação Ao Paciente
    const R = rows.filter((r) => !r.awaitingFirstEvaluation);

    if (R.length === 0) {
      return {
        reconciledRows: rows,
        reconciledOverall: {
          exactMean: 0,
          roundedR5: 0,
          formattedR5: '≈ +0%',
          statusKey: 'base',
          statusWord: 'AGUARDANDO',
          statusSym: '·',
          statusLabel: 'AGUARDANDO ·',
          statusCls: 'flat',
          statusColor: '#93a4bd',
          band: 'referência 0%',
          isMisto: false,
          hasAnyPior: false,
          evaluatedCount: 0,
          bipolarBar: {
            r5: 0,
            widthPercent: 0,
            direction: 'center' as const
          },
          summaryCountsText: 'Nenhum check-in respondido ainda',
          interpretationText:
            'Seus sintomas iniciais foram registrados como ponto de partida (Base · 0%). Assim que o 1º Check-in for respondido, sua evolução aparecerá aqui.',
          averagePercent: 0,
          displayScore: 0
        }
      };
    }

    const I = R.reduce((acc, r) => acc + (r.val ?? 0), 0) / R.length;
    const rawR5 = Math.round(I / 5) * 5;
    const r5 = Object.is(rawR5, -0) ? 0 : rawR5;
    const formattedR5 = `≈ ${r5 >= 0 ? '+' : ''}${r5}%`;

    const baseBandKey = bandOfMean(I);
    const hasAnyPior = R.some((r) => r.statusKey === 'pior');
    const isMisto = hasAnyPior && baseBandKey !== 'pior';

    const effectiveOverallMeta = isMisto ? MAPA_GERAL_ST.misto : MAPA_GERAL_ST[baseBandKey];

    // Contagens para Linha 1 (Resumo Clínico)
    const melhoraCount = R.filter(
      (r) => r.statusKey === 'pouco' || r.statusKey === 'muito' || r.statusKey === 'sem'
    ).length;
    const remissaoCount = R.filter((r) => r.statusKey === 'sem').length;
    const estavelCount = R.filter((r) => r.statusKey === 'igual').length;
    const atencaoCount = R.filter((r) => r.statusKey === 'pior').length;

    const melhoraPart =
      remissaoCount > 0
        ? `${melhoraCount} em melhora (${remissaoCount} em remissão)`
        : `${melhoraCount} em melhora`;
    const estavelPart = `${estavelCount} ${estavelCount === 1 ? 'estável' : 'estáveis'}`;
    const atencaoPart = `${atencaoCount} em atenção`;
    const summaryCountsText = `${melhoraPart} · ${estavelPart} · ${atencaoPart}`;

    // Linha 2 (interpretationText)
    let interpretationText = '';
    if (isMisto) {
      interpretationText = `Evolução mista (${formattedR5}): há melhora em ${melhoraCount} sintoma(s), porém ${atencaoCount} sintoma(s) exige(m) atenção clínica individualizada.`;
    } else if (baseBandKey === 'sem') {
      interpretationText = `Excelente evolução (${formattedR5}): seus sintomas avaliados atingiram faixa de remissão em relação ao início do acompanhamento.`;
    } else if (baseBandKey === 'muito') {
      interpretationText = `Evolução muito positiva (${formattedR5}): houve melhora importante nos sintomas avaliados em comparação com a primeira avaliação.`;
    } else if (baseBandKey === 'pouco') {
      interpretationText = `Evolução positiva (${formattedR5}): seus sintomas apresentam melhora parcial consistente desde o início do acompanhamento.`;
    } else if (baseBandKey === 'igual') {
      interpretationText = `Quadro estável (${formattedR5}): os sintomas avaliados mantêm estabilidade em relação à avaliação inicial.`;
    } else {
      interpretationText = `Ponto de atenção (${formattedR5}): houve intensificação nos sintomas relatados em relação ao início, orientando ajuste fino no acompanhamento.`;
    }

    const widthPercent = Math.min(100, Math.abs(r5)) / 2;

    const statusBadgeText = isMisto
      ? 'MISTO ◐'
      : `${effectiveOverallMeta.word.toUpperCase()} ${effectiveOverallMeta.sym}`;

    return {
      reconciledRows: rows,
      reconciledOverall: {
        exactMean: I,
        roundedR5: r5,
        formattedR5,
        statusKey: effectiveOverallMeta.key,
        statusWord: effectiveOverallMeta.word,
        statusSym: effectiveOverallMeta.sym,
        statusLabel: statusBadgeText,
        statusCls: effectiveOverallMeta.cls,
        statusColor: effectiveOverallMeta.color,
        band: effectiveOverallMeta.band,
        isMisto,
        hasAnyPior,
        evaluatedCount: R.length,
        bipolarBar: {
          r5,
          widthPercent,
          direction: r5 >= 0 ? ('right' as const) : ('left' as const)
        },
        summaryCountsText,
        interpretationText,
        averagePercent: r5,
        displayScore: Math.abs(r5)
      }
    };
  }, [effectiveWellbeing, activeQuestions, checkinsAsc]);

  const latestCheckinDateBr = useMemo(() => {
    if (checkinsAsc.length === 0) return null;
    const last = checkinsAsc[checkinsAsc.length - 1];
    return toFullDateBr(last.dateStr || last.createdAt);
  }, [checkinsAsc]);

  const todayBr = useMemo(() => {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `${d}/${m}/${y}`;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await crmDataService.refreshClinicalEvolutions(targetPatientEmail);
    } finally {
      setTimeout(() => setIsRefreshing(false), 350);
    }
  };

  const handleOpenModal = () => {
    setAnswers({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  const handleSelectOption = (tagId: string, optionKey: PgiAnswerKey) => {
    setAnswers((prev) => ({
      ...prev,
      [tagId]: optionKey
    }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmitDynamicCheckin = async () => {
    if (activeQuestions.length === 0) {
      setSubmitError('Nenhuma pergunta ativa disponível para envio no momento.');
      return;
    }

    const unanswered = activeQuestions.filter((q) => !answers[q.tagId]);
    if (unanswered.length > 0) {
      setSubmitError(
        unanswered.length === 1
          ? `Por favor, responda sobre "${unanswered[0].label}" antes de enviar.`
          : `Faltam ${unanswered.length} respostas para concluir seu check-in.`
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const questionLabels: Record<string, string> = {};
    const selectedVals: number[] = [];

    activeQuestions.forEach((q) => {
      questionLabels[q.tagId] = q.label;
      const chosenKey = answers[q.tagId];
      const st = MAPA_GERAL_ST[chosenKey] || MAPA_GERAL_ST.igual;
      selectedVals.push(st.val);
    });

    const exactMean =
      selectedVals.length > 0
        ? selectedVals.reduce((acc, v) => acc + v, 0) / selectedVals.length
        : 0;
    const rawR5 = Math.round(exactMean / 5) * 5;
    const r5 = Object.is(rawR5, -0) ? 0 : rawR5;

    const checkinNumber = checkinsAsc.length + 1;
    const checkinId = `chk_${Date.now()}`;

    const payload: CheckinFirestoreDoc = {
      id: checkinId,
      patientEmail: targetPatientEmail.toLowerCase(),
      createdAt: new Date().toISOString(),
      dateStr: todayBr,
      dayLabel: `${checkinNumber}º CHECK-IN`,
      mode: 'dynamic_tags',
      source: 'patient_app',
      answers: { ...answers },
      questionLabels,
      exactMean,
      averagePercent: r5,
      ivp: r5
    };

    try {
      if (isFirebaseConfigured() && db) {
        const checkinRef = doc(db, 'patients', targetPatientEmail, 'checkins', checkinId);
        await setDoc(checkinRef, payload);
        setIsCloudSynced(true);
      } else {
        // Atualização otimista local caso offline
        setCheckinsAsc((prev) => [...prev, payload]);
      }
      setSubmittedConfirmation(true);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar check-in (Mapa Geral v7):', err);
      setSubmitError('Não foi possível enviar suas respostas agora. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const answeredCount = activeQuestions.filter((q) => Boolean(answers[q.tagId])).length;

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-4">
      {/* Topo da Aba: Meu Bem-Estar + Sincronização */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[20px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
          Meu Bem-Estar
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCloudSynced && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#5eea8f]/10 border border-[#5eea8f]/25 text-[#5eea8f] text-[12px] font-semibold">
              <CloudCheck className="w-3.5 h-3.5 text-[#5eea8f]" />
              <span className="hidden xs:inline">Nuvem</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/15 text-[14px] font-semibold text-[#e8f5f0] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#5eea8f] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cartão para responder ao Check-in de Sintomas (sem botão + Novo sintoma) */}
      <div className="bg-gradient-to-br from-[#1c1838] via-[#121124] to-[#0d0d16] border border-[#7c6af7]/35 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] shrink-0 mt-0.5">
            <Calendar className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[19px] font-bold text-[#5eea8f] uppercase tracking-wide flex items-center flex-wrap gap-2 leading-tight">
              <span>REALIZAR CHECK-IN</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#5eea8f]/20 border border-[#5eea8f]/40 text-white text-[15px] font-bold tracking-normal tabular-nums">
                {todayBr}
              </span>
            </div>
            <div className="text-[16px] text-[#cfd3dc] mt-1 font-medium leading-snug italic">
              Desde o início do acompanhamento · considere as últimas 4 semanas
            </div>
            {activeQuestions.length > 0 && (
              <div className="text-[13px] text-[#93a4bd] mt-1">
                {activeQuestions.length}{' '}
                {activeQuestions.length === 1 ? 'sintoma monitorado' : 'sintomas monitorados'}
                {latestCheckinDateBr ? ` · Última avaliação: ${latestCheckinDateBr}` : ''}
              </div>
            )}
          </div>
        </div>

        {submittedConfirmation && (
          <div className="p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/35 flex items-start gap-2.5 text-left animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
            <div className="text-[15px] text-[#d1fae5] leading-snug">
              <strong className="font-semibold text-white">Check-in registrado com sucesso!</strong> Seu Mapa Geral foi atualizado instantaneamente.
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleOpenModal}
          className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-[#0f7a3a] to-[#108c43] hover:from-[#139247] hover:to-[#0f7a3a] border border-[#5eea8f]/40 text-white font-bold text-[17px] shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center"
        >
          <span>{checkinsAsc.length > 0 ? 'Responder Novo Check-in' : 'Iniciar 1º Check-in'}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* C. CONTAINER PRINCIPAL — MAPA GERAL v7 (IDÊNTICO AO CRM)              */}
      {/* ===================================================================== */}
      <div className="bg-[#070a10] border border-[#1c2432] rounded-3xl p-5 shadow-xl space-y-4">
        {/* Cabeçalho do Mapa Geral */}
        <div className="space-y-1">
          <h2 className="text-[22px] font-bold text-[#f2f6fc] tracking-tight leading-tight">
            Mapa Geral
          </h2>
        </div>

        {/* Seletor de Modo de Visualização (2 Botões) */}
        <div className="space-y-2 pt-1">
          <div
            className="text-[12px] font-semibold uppercase tracking-wider text-[#93a4bd]"
            style={{ borderColor: '#dde4eb' }}
          >
            Selecione a visualização desejada
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className={`min-h-[54px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer flex flex-col items-center justify-center text-center leading-tight ${
                viewMode === 'compare'
                  ? 'bg-[#5eea8f]/18 border-2 border-[#5eea8f] text-[#5eea8f] shadow-md shadow-[#5eea8f]/15'
                  : 'bg-white/[0.04] border border-[#5eea8f]/45 text-[#e2e8f0] hover:bg-white/[0.08] hover:border-[#5eea8f]/75'
              }`}
            >
              <span className="text-[14px] font-extrabold uppercase tracking-wide">
                COMPARAR REGISTROS
              </span>
              <span
                className={`text-[12px] font-semibold mt-0.5 ${
                  viewMode === 'compare' ? 'text-[#d1fae5]' : 'text-[#93a4bd]'
                }`}
              >
                Primeira Sessão ao Atual
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('current')}
              className={`min-h-[54px] px-3.5 py-2.5 rounded-xl text-[14px] font-extrabold tracking-wide transition-all cursor-pointer flex items-center justify-center text-center leading-tight ${
                viewMode === 'current'
                  ? 'bg-[#5eea8f]/18 border-2 border-[#5eea8f] text-[#5eea8f] shadow-md shadow-[#5eea8f]/15'
                  : 'bg-white/[0.04] border border-[#5eea8f]/45 text-[#e2e8f0] hover:bg-white/[0.08] hover:border-[#5eea8f]/75'
              }`}
            >
              Visualizar Registro Atual
            </button>
          </div>
        </div>

        {/* Tabela / Lista de Sintomas Monitorados */}
        {reconciledRows.length === 0 ? (
          <div className="bg-[#0e131b] border border-[#1c2432] rounded-2xl p-5 text-center space-y-1.5">
            <div className="text-[17px] font-bold text-[#f2f6fc]">
              Nenhum sintoma monitorado no momento
            </div>
            <p className="text-[14px] text-[#93a4bd] leading-snug">
              Os sintomas cadastrados pelo profissional na aba Evolução Clínica do CRM aparecerão automaticamente aqui.
            </p>
          </div>
        ) : (
          <div className="border border-[#1c2432] rounded-2xl overflow-hidden bg-[#0b0f17]">
            {/* Cabeçalho de Colunas (Span 1 com quebra de linha, Span 2 removido) */}
            <div className="px-4 py-3 bg-[#0e131b] border-b border-[#1c2432] flex items-center justify-between gap-2 text-[12px] font-bold uppercase tracking-wider text-[#93a4bd] leading-snug">
              <span>
                SINTOMA E OUTROS/
                <br />
                STATUS
              </span>
            </div>

            {/* Linhas de Sintoma */}
            <div className="divide-y divide-[#1c2432]">
              {reconciledRows.map((row) => {
                const initPt: MapaGeralPoint = row.initialPoint || {
                  key: 'base',
                  optionLabel: 'Base (início)',
                  word: 'Base',
                  sym: '·',
                  cls: 'flat',
                  color: '#93a4bd',
                  band: 'referência 0%',
                  val: 0,
                  date: row.startDate,
                  dateBr: toFullDateBr(row.startDateBr || row.startDate),
                  shortDateBr: toShortDateBr(row.startDateBr || row.startDate)
                };

                const curPt = row.currentPoint || null;
                const points =
                  row.awaitingFirstEvaluation || !curPt ? [initPt] : [initPt, curPt];

                const statusTextColor = row.awaitingFirstEvaluation
                  ? '#93a4bd'
                  : row.statusKey === 'igual'
                  ? '#fbbf24'
                  : (row.statusColor || curPt?.color || '#5eea8f');

                // Cor viva do gráfico estilo anterior (nunca cinza invisível quando avaliado)
                const sparklineHex = row.awaitingFirstEvaluation
                  ? '#64748b'
                  : row.statusKey === 'pior'
                  ? '#ff4757'
                  : row.statusKey === 'igual'
                  ? '#fbbf24'
                  : row.statusKey === 'sem'
                  ? '#fcd34d'
                  : '#5eea8f';

                const svgWidth = 320;
                const svgHeight = 44;
                const padX = 8;
                const yTop = 8;
                const yMid = 22;
                const yBottom = 36;

                const mapValToY = (v: number): number => {
                  const clamped = Math.max(-40, Math.min(100, v));
                  if (Math.abs(clamped) < 0.01) return yMid;
                  if (clamped > 0) {
                    return yMid - (clamped / 100) * (yMid - yTop);
                  }
                  return yMid + (Math.abs(clamped) / 40) * (yBottom - yMid);
                };

                const x1 = padX;
                const x2 = svgWidth - padX;
                const y1 = mapValToY(initPt.val ?? 0);
                const y2 = curPt ? mapValToY(curPt.val ?? 0) : y1;
                const midX = x1 + (x2 - x1) * 0.5;
                const curvePath = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
                const filterId = `glow-v7-${row.tagId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

                return (
                  <div key={row.tagId} className="px-4 py-3.5 space-y-2">
                    {/* Topo de cada sintoma: Nome + Status Atual colorido (igual na imagem) */}
                    <div className="min-w-0">
                      <div
                        className="font-bold text-[#f2f6fc] leading-snug break-words"
                        style={{ fontFamily: 'Georgia, serif', fontSize: '19px' }}
                      >
                        {row.label}
                      </div>

                      <div className="text-[15px] font-bold leading-snug mt-0.5 flex flex-wrap items-center gap-1">
                        <span style={{ color: statusTextColor, fontSize: '17px' }}>
                          {row.awaitingFirstEvaluation ? '— sem resposta' : row.statusLabel}
                        </span>
                        {row.confirmedRemission && (
                          <span className="text-[12px] font-semibold text-[#fcd34d]">
                            · remissão confirmada (2 check-ins seguidos)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quando selecionado COMPARAR REGISTROS (viewMode === "compare") */}
                    {viewMode === 'compare' && (
                      <div className="w-full h-[44px] pt-0.5">
                        <svg
                          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                          className="w-full h-full overflow-visible"
                          aria-label={`Evolução de ${row.label}`}
                        >
                          <defs>
                            <filter id={filterId} x="-10%" y="-25%" width="120%" height="150%">
                              <feDropShadow
                                dx="0"
                                dy="2"
                                stdDeviation="2.2"
                                floodColor="#22d3ee"
                                floodOpacity="0.38"
                              />
                            </filter>
                          </defs>

                          {/* Linhas de referência horizontais discretas */}
                          <line
                            x1={padX}
                            y1={yTop}
                            x2={svgWidth - padX}
                            y2={yTop}
                            stroke="rgba(255,255,255,0.06)"
                            strokeDasharray="3 3"
                          />
                          <line
                            x1={padX}
                            y1={yMid}
                            x2={svgWidth - padX}
                            y2={yMid}
                            stroke="rgba(255,255,255,0.10)"
                            strokeDasharray="3 3"
                          />
                          <line
                            x1={padX}
                            y1={yBottom}
                            x2={svgWidth - padX}
                            y2={yBottom}
                            stroke="rgba(255,255,255,0.06)"
                            strokeDasharray="3 3"
                          />

                          {/* Curva Bezier Cian com brilho estilo anterior ligando Inicial e Atual */}
                          {points.length === 2 && curPt && (
                            <>
                              <path
                                d={curvePath}
                                fill="none"
                                stroke="#22d3ee"
                                strokeWidth="4.5"
                                strokeOpacity={0.2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d={curvePath}
                                fill="none"
                                stroke="#22d3ee"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                filter={`url(#${filterId})`}
                              />
                            </>
                          )}

                          {/* Ponto 1: Avaliação Inicial */}
                          <g
                            className="cursor-pointer"
                            onClick={() =>
                              setSelectedPointDetail({
                                symptomLabel: row.label,
                                stageLabel: 'Avaliação Inicial',
                                point: initPt
                              })
                            }
                          >
                            <circle cx={x1} cy={y1} r="6.5" fill={sparklineHex} fillOpacity="0.22" />
                            <circle
                              cx={x1}
                              cy={y1}
                              r="4"
                              fill={sparklineHex}
                              stroke="#0b0f17"
                              strokeWidth="1.8"
                            />
                            <circle cx={x1} cy={y1} r="1.5" fill="#ffffff" />
                            <circle cx={x1} cy={y1} r="12" fill="transparent" />
                          </g>

                          {/* Ponto 2: Avaliação Atual (quando houver check-in) */}
                          {points.length === 2 && curPt && (
                            <g
                              className="cursor-pointer"
                              onClick={() =>
                                setSelectedPointDetail({
                                  symptomLabel: row.label,
                                  stageLabel: 'Avaliação Atual',
                                  point: curPt
                                })
                              }
                            >
                              <circle cx={x2} cy={y2} r="6.5" fill={sparklineHex} fillOpacity="0.22" />
                              <circle
                                cx={x2}
                                cy={y2}
                                r="4"
                                fill={sparklineHex}
                                stroke="#0b0f17"
                                strokeWidth="1.8"
                              />
                              <circle cx={x2} cy={y2} r="1.5" fill="#ffffff" />
                              <circle cx={x2} cy={y2} r="12" fill="transparent" />
                            </g>
                          )}
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* CARD DE MÉDIA GERAL + BARRA BIPOLAR + INTERPRETAÇÃO AO PACIENTE     */}
        {/* =================================================================== */}
        <div className="bg-[#0e131b] border border-[#1c2432] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[20px] font-bold text-[#f2f6fc] leading-tight">
              Média Geral
            </h3>

            <span
              className="px-3 py-1 rounded-xl border text-[13px] font-extrabold uppercase tracking-wide shrink-0"
              style={{
                color: reconciledOverall.statusColor || '#93a4bd',
                borderColor: `${reconciledOverall.statusColor || '#93a4bd'}55`,
                backgroundColor: `${reconciledOverall.statusColor || '#93a4bd'}1a`
              }}
            >
              {reconciledOverall.statusLabel}
            </span>
          </div>

          <div
            className="text-[28px] font-extrabold leading-none tabular-nums"
            style={{ color: reconciledOverall.statusColor || '#93a4bd' }}
          >
            {reconciledOverall.formattedR5}
          </div>

          {/* Barra Bipolar (Centro fixo em 50% = 0% de referência) */}
          <div className="space-y-1">
            <div className="relative h-3 w-full rounded-full bg-[#070a10] border border-[#1c2432] overflow-hidden">
              {/* Marcador central de 0% em 50% */}
              <div className="absolute top-0 bottom-0 left-1/2 w-[1.5px] bg-white/30 z-10 -translate-x-1/2" />

              {reconciledOverall.bipolarBar &&
                reconciledOverall.bipolarBar.widthPercent > 0 &&
                (reconciledOverall.bipolarBar.r5 >= 0 ? (
                  <div
                    className="absolute top-0 bottom-0 rounded-r-full transition-all duration-500"
                    style={{
                      left: '50%',
                      width: `${reconciledOverall.bipolarBar.widthPercent}%`,
                      backgroundColor: reconciledOverall.isMisto
                        ? '#fb923c'
                        : '#2dd36f'
                    }}
                  />
                ) : (
                  <div
                    className="absolute top-0 bottom-0 rounded-l-full transition-all duration-500"
                    style={{
                      right: '50%',
                      width: `${reconciledOverall.bipolarBar.widthPercent}%`,
                      backgroundColor: '#ff4757'
                    }}
                  />
                ))}
            </div>

            <div className="flex items-center justify-between text-[10px] font-semibold text-[#93a4bd] tabular-nums">
              <span>−100%</span>
              <span>Base 0%</span>
              <span>+100%</span>
            </div>
          </div>

          {/* Interpretação Clara Apresentada à Pessoa */}
          <div className="pt-2 border-t border-[#1c2432] space-y-1.5">
            <div className="text-[13px] font-bold text-[#f2f6fc] leading-snug">
              {reconciledOverall.summaryCountsText}
            </div>
            <p className="text-[14px] text-[#cfd8e3] leading-relaxed">
              {reconciledOverall.interpretationText}
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODAL DE DETALHE DO PONTO (CLIQUE NAS BOLINHAS DO GRÁFICO)            */}
      {/* ===================================================================== */}
      {selectedPointDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedPointDetail(null)}
        >
          <div
            className="w-full max-w-[360px] rounded-2xl bg-[#0e131b] border border-[#1c2432] p-4 shadow-2xl space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#1c2432] pb-2.5">
              <div>
                <div className="text-[12px] font-bold uppercase tracking-wider text-[#5eea8f]">
                  {selectedPointDetail.stageLabel}
                </div>
                <div className="text-[18px] font-bold text-[#f2f6fc] leading-tight mt-0.5">
                  {selectedPointDetail.symptomLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPointDetail(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[14px]">
              <div className="flex items-center justify-between">
                <span className="text-[#93a4bd]">Data:</span>
                <span className="font-semibold text-[#f2f6fc]">
                  {selectedPointDetail.point.dateBr ||
                    toFullDateBr(selectedPointDetail.point.date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#93a4bd]">Resposta dada:</span>
                <span className="font-semibold text-[#f2f6fc]">
                  {selectedPointDetail.point.optionLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#93a4bd]">Status clínico:</span>
                <span
                  className="font-bold"
                  style={{ color: selectedPointDetail.point.color }}
                >
                  {selectedPointDetail.point.word} {selectedPointDetail.point.sym}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#93a4bd]">Faixa:</span>
                <span className="font-semibold text-[#f2f6fc]">
                  {selectedPointDetail.point.band}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedPointDetail(null)}
              className="w-full min-h-[42px] rounded-xl bg-white/10 hover:bg-white/15 text-[#f2f6fc] font-bold text-[14px] transition cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE CHECK-IN DE SINTOMAS (ESCALA OFICIAL MAPA GERAL v7 — 5 OPÇÕES) */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-[430px] max-h-[92vh] rounded-3xl bg-[#070a10] border border-[#1c2432] flex flex-col overflow-hidden shadow-2xl font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Cabeçalho do Modal */}
            <div className="p-4 bg-[#0e131b] border-b border-[#1c2432] flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="text-[20px] font-bold text-[#f2f6fc] leading-tight">
                  Check-in de Sintomas
                </div>
                <div className="text-[14px] text-[#5eea8f] font-semibold mt-0.5 tabular-nums">
                  {activeQuestions.length > 0
                    ? `${answeredCount} de ${activeQuestions.length} respondidas`
                    : 'Acompanhamento Clínico'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center transition active:scale-95 cursor-pointer shrink-0 ml-2"
                title="Fechar questionário"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo do Modal */}
            <div className="grow overflow-y-auto px-3.5 py-4 space-y-4 no-scrollbar">
              {/* Subtítulo oficial de contexto ancorado no início */}
              <div className="bg-[#0e131b] border border-[#1c2432] rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-[#cfd8e3] text-center leading-snug italic">
                Desde o início do acompanhamento · considere as últimas 4 semanas
              </div>

              {activeQuestions.length === 0 ? (
                <div className="bg-[#0e131b] border border-[#1c2432] rounded-2xl p-5 text-center space-y-2.5">
                  <div className="text-[18px] font-semibold text-[#f2f6fc]">
                    Nenhuma pergunta ativa publicada
                  </div>
                  <p className="text-[15px] text-[#93a4bd] leading-relaxed">
                    As perguntas personalizadas do seu check-in aparecerão aqui automaticamente assim que forem liberadas pelo seu nutricionista no CRM.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white text-[16px] font-semibold transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeQuestions.map((q, qIdx) => {
                    const selectedKey = answers[q.tagId];
                    const questionTitle =
                      q.questionText && q.questionText.includes('Desde o início')
                        ? q.questionText
                        : `Desde o início do acompanhamento, como está "${q.label}"?`;
                    const questionSubtext = q.anchorSubtext || 'considere as últimas 4 semanas';

                    return (
                      <div
                        key={q.id || q.tagId}
                        className="bg-[#0e131b] border border-[#1c2432] rounded-2xl p-4 shadow-sm space-y-3"
                      >
                        <div>
                          <div className="text-[13px] font-bold uppercase tracking-wider text-[#5eea8f] mb-1">
                            {String(qIdx + 1).padStart(2, '0')} · {q.label}
                          </div>
                          <div className="text-[17px] font-bold text-[#f2f6fc] leading-snug">
                            {questionTitle}
                          </div>
                          <div className="text-[13px] italic text-[#93a4bd] mt-0.5">
                            {questionSubtext}
                          </div>
                        </div>

                        {/* 5 Botões de Resposta (Escala Oficial v7) */}
                        <div className="space-y-2">
                          {OFFICIAL_V7_OPTIONS.map((opt) => {
                            const isSelected = selectedKey === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() =>
                                  handleSelectOption(q.tagId, opt.key as PgiAnswerKey)
                                }
                                style={
                                  isSelected
                                    ? {
                                        borderColor: opt.color,
                                        backgroundColor: `${opt.color}22`
                                      }
                                    : undefined
                                }
                                className={`w-full min-h-[52px] px-3.5 py-2.5 rounded-xl border text-left transition-all cursor-pointer active:scale-[0.99] flex items-center justify-between gap-2 ${
                                  isSelected
                                    ? 'text-[#f2f6fc] shadow-md'
                                    : 'bg-[#070a10] hover:bg-white/[0.04] border-[#1c2432] text-[#cfd8e3]'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="text-[16px] font-bold text-[#f2f6fc] leading-tight">
                                    {opt.label}
                                  </div>
                                  <div
                                    className="text-[12px] font-semibold mt-0.5"
                                    style={{ color: opt.color }}
                                  >
                                    {opt.word} {opt.sym}
                                  </div>
                                </div>

                                <span
                                  className="text-[11px] font-bold px-2 py-1 rounded-lg border shrink-0 tabular-nums"
                                  style={{
                                    color: opt.color,
                                    borderColor: `${opt.color}44`,
                                    backgroundColor: `${opt.color}14`
                                  }}
                                >
                                  {opt.band}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 text-[15px] leading-snug text-center">
                      {submitError}
                    </div>
                  )}

                  <div className="pt-1 pb-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitDynamicCheckin}
                      className="w-full min-h-[50px] py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0f7a3a] via-[#129446] to-[#0f7a3a] hover:from-[#139247] hover:to-[#108c43] disabled:opacity-60 border border-[#5eea8f]/50 text-white font-bold text-[17px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      <span>{isSubmitting ? 'Salvando Check-in...' : 'Salvar Check-in'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
