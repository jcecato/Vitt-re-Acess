import React, { useState, useEffect, useMemo } from 'react';
import { PatientProfile, CheckinQuestionItem, CheckinQuestionOption } from '../../types/patient';
import { X, CheckCircle2, Calendar, Activity, CloudCheck, RefreshCw } from 'lucide-react';
import { db, isFirebaseConfigured } from '../../config/firebase';
import { collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { crmDataService } from '../../services/crmDataService';

interface EvolutionTabProps {
  patient: PatientProfile;
}

interface DynamicCheckinDoc {
  id: string;
  mode: 'dynamic_tags';
  answers: Record<string, string>;
  questionLabels: Record<string, string>;
  createdAt: string;
  dateStr: string;
  patientEmail: string;
  patientName: string;
}

const DEFAULT_STANDARD_OPTIONS: CheckinQuestionOption[] = [
  { key: 'declinio', label: 'Declínio', deltaPercent: -25 },
  { key: 'estavel', label: 'Estável', deltaPercent: 0 },
  { key: 'em_melhora', label: 'Em melhora', deltaPercent: 25 },
  { key: 'recuperado_100', label: 'Recuperado — 100%', deltaPercent: 100 }
];

export const EvolutionTab: React.FC<EvolutionTabProps> = ({ patient }) => {
  const targetPatientEmail = (patient.email && patient.email.includes('@'))
    ? patient.email.trim().toLowerCase()
    : (patient.id && patient.id.includes('@') ? patient.id.trim().toLowerCase() : 'jcecato@gmail.com');

  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [allDynamicCheckins, setAllDynamicCheckins] = useState<DynamicCheckinDoc[]>([]);
  const [latestDynamicCheckin, setLatestDynamicCheckin] = useState<DynamicCheckinDoc | null>(null);
  const [latestAnyCheckinDate, setLatestAnyCheckinDate] = useState<string | null>(null);
  const [submittedConfirmation, setSubmittedConfirmation] = useState<boolean>(false);

  // Modal dinâmico de Check-in
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sincronização inicial dos dados longitudinais (evolution/resumo_geral)
  useEffect(() => {
    crmDataService.refreshClinicalEvolutions(targetPatientEmail);
  }, [targetPatientEmail]);

  // Listener em tempo real da subcoleção /patients/{email}/checkins
  useEffect(() => {
    if (!isFirebaseConfigured() || !db) return;

    try {
      const colRef = collection(db, 'patients', targetPatientEmail, 'checkins');
      const q = query(colRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        setIsCloudSynced(true);
        const dynamicDocsDesc: DynamicCheckinDoc[] = [];
        let firstDateStr: string | null = null;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!firstDateStr && typeof data?.dateStr === 'string' && data.dateStr.trim().length > 0) {
            firstDateStr = data.dateStr.trim();
          }
          if (data?.answers && typeof data.answers === 'object') {
            dynamicDocsDesc.push({
              id: docSnap.id,
              mode: data.mode || 'dynamic_tags',
              answers: data.answers,
              questionLabels: data.questionLabels || {},
              createdAt: data.createdAt || new Date().toISOString(),
              dateStr: data.dateStr || '',
              patientEmail: data.patientEmail || targetPatientEmail,
              patientName: data.patientName || patient.name || 'Paciente'
            });
          }
        });

        // Ordem cronológica (mais antigo -> mais recente) para construir as colunas 1º CHECK-IN, 2º CHECK-IN...
        const chronological = [...dynamicDocsDesc].reverse();
        setAllDynamicCheckins(chronological);
        setLatestDynamicCheckin(dynamicDocsDesc[0] || null);
        setLatestAnyCheckinDate(firstDateStr);

        // Se todos os check-ins foram deletados no Firebase para recomeçar, limpa confirmação local
        if (dynamicDocsDesc.length === 0) {
          setSubmittedConfirmation(false);
        }
      }, (err) => {
        console.info('🔒 [Vittáre Check-in] Subcoleção checkins em modo seguro:', err?.code);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Falha ao inicializar listener de checkins:', e);
    }
  }, [targetPatientEmail, patient.name]);

  const wellbeing = patient.wellbeingData;
  const activeQuestions: CheckinQuestionItem[] = useMemo(
    () => wellbeing?.activeCheckinQuestions || [],
    [wellbeing?.activeCheckinQuestions]
  );

  // Constrói colunas e matriz longitudinal combinando /evolution/resumo_geral e os documentos reais de /checkins
  const { encounters, needsMatrix, overallEvolution } = useMemo(() => {
    const baseEncounters = [...(wellbeing?.encounters || [])];
    const baseMatrix = (wellbeing?.needsMatrix || []).map((row) => ({
      ...row,
      cumulativeByEncounter: { ...(row.cumulativeByEncounter || {}) },
      valuesByEncounter: { ...(row.valuesByEncounter || {}) }
    }));

    // Se não há check-ins na coleção /checkins, retorna exatamente o estado base (ou o que veio de resumo_geral)
    if (allDynamicCheckins.length === 0) {
      return {
        encounters: baseEncounters,
        needsMatrix: baseMatrix,
        overallEvolution: wellbeing?.overallEvolution
      };
    }

    // Filtra check-ins de /checkins que ainda não estão consolidados como colunas em baseEncounters
    const existingIds = new Set(baseEncounters.map((e) => e.id));
    const pendingCheckins = allDynamicCheckins.filter((chk) => !existingIds.has(chk.id));

    if (pendingCheckins.length === 0) {
      return {
        encounters: baseEncounters,
        needsMatrix: baseMatrix,
        overallEvolution: wellbeing?.overallEvolution
      };
    }

    const mergedEncounters = [...baseEncounters];
    pendingCheckins.forEach((chk, idx) => {
      const checkNumber = idx + 1;
      const shortDate = chk.dateStr ? chk.dateStr.slice(0, 5) : undefined;
      mergedEncounters.push({
        id: chk.id,
        label: `${checkNumber}º CHECK-IN`,
        shortDateBr: shortDate,
        date: chk.createdAt
      });
    });

    // Mapa de opções por tagId para obter o deltaPercent exato configurado no CRM
    const optionsByTag: Record<string, CheckinQuestionOption[]> = {};
    activeQuestions.forEach((q) => {
      optionsByTag[q.tagId] = q.options && q.options.length > 0 ? q.options : DEFAULT_STANDARD_OPTIONS;
    });

    const updatedMatrix = baseMatrix.map((row) => {
      let runningPct = row.awaitingFirstEvaluation ? 0 : (row.accumulatedPercent ?? 0);
      let evaluated = !row.awaitingFirstEvaluation;
      let latestStatusKey = '';
      const cumByEnc = { ...row.cumulativeByEncounter };
      const valByEnc = { ...row.valuesByEncounter };

      pendingCheckins.forEach((chk) => {
        const answerKey = chk.answers?.[row.tagId];
        if (!answerKey) {
          cumByEnc[chk.id] = evaluated ? runningPct : null;
          return;
        }

        const opts = optionsByTag[row.tagId] || DEFAULT_STANDARD_OPTIONS;
        const matchedOpt = opts.find((o) => o.key === answerKey);
        const delta =
          typeof matchedOpt?.deltaPercent === 'number'
            ? matchedOpt.deltaPercent
            : answerKey === 'declinio'
            ? -15
            : answerKey === 'em_melhora'
            ? 25
            : answerKey === 'recuperado_100'
            ? 100
            : 0;

        if (answerKey === 'recuperado_100') {
          runningPct = 100;
        } else {
          runningPct = Math.max(-100, Math.min(100, runningPct + delta));
        }

        evaluated = true;
        latestStatusKey = answerKey;
        cumByEnc[chk.id] = runningPct;
        valByEnc[chk.id] = {
          status: answerKey,
          deltaPercent: delta,
          cumulativePercent: runningPct
        };
      });

      const resolvedStatusLabel = !evaluated
        ? 'Aguardando 1º Check-in'
        : runningPct >= 100 || latestStatusKey === 'recuperado_100'
        ? 'Recuperado — 100%'
        : runningPct > 0
        ? 'Em melhora'
        : runningPct < 0
        ? 'Declínio'
        : 'Estável';

      return {
        ...row,
        cumulativeByEncounter: cumByEnc,
        valuesByEncounter: valByEnc,
        awaitingFirstEvaluation: !evaluated,
        accumulatedPercent: runningPct,
        statusLabel: resolvedStatusLabel
      };
    });

    const evaluatedRows = updatedMatrix.filter((r) => !r.awaitingFirstEvaluation);
    const avgPct =
      evaluatedRows.length > 0
        ? Math.round(
            evaluatedRows.reduce((acc, r) => acc + (r.accumulatedPercent || 0), 0) / evaluatedRows.length
          )
        : 0;
    const displayScore =
      evaluatedRows.length > 0
        ? Math.max(0, Math.min(100, avgPct >= 0 ? avgPct : 50 + avgPct / 2))
        : 0;
    const overallStatusLabel =
      avgPct >= 100
        ? 'Recuperado — 100%'
        : avgPct > 0
        ? 'Em melhora'
        : avgPct < 0
        ? 'Declínio'
        : 'Estável';

    return {
      encounters: mergedEncounters,
      needsMatrix: updatedMatrix,
      overallEvolution: {
        averagePercent: avgPct,
        displayScore,
        statusLabel: overallStatusLabel
      }
    };
  }, [wellbeing?.encounters, wellbeing?.needsMatrix, wellbeing?.overallEvolution, allDynamicCheckins, activeQuestions]);

  // Detecta se há um check-in registrado na coleção /checkins
  const isAwaitingCrmSync = useMemo(() => {
    if (allDynamicCheckins.length === 0) return false;
    if (submittedConfirmation) return true;
    if (!latestDynamicCheckin?.createdAt) return false;
    if (!wellbeing?.updatedAt) return true;
    const chkTime = Date.parse(latestDynamicCheckin.createdAt);
    const wbTime = typeof wellbeing.updatedAt === 'number'
      ? wellbeing.updatedAt
      : Date.parse(String(wellbeing.updatedAt));
    if (Number.isNaN(chkTime) || Number.isNaN(wbTime)) return false;
    return chkTime > wbTime;
  }, [allDynamicCheckins.length, submittedConfirmation, latestDynamicCheckin, wellbeing?.updatedAt]);

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

  const handleSelectOption = (tagId: string, optionKey: string) => {
    setAnswers(prev => ({
      ...prev,
      [tagId]: optionKey
    }));
    if (submitError) setSubmitError(null);
  };

  const handleSubmitDynamicCheckin = async () => {
    if (activeQuestions.length === 0) {
      setSubmitError('Nenhuma pergunta de acompanhamento disponível para envio no momento.');
      return;
    }

    const unanswered = activeQuestions.filter(q => !answers[q.tagId]);
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
    activeQuestions.forEach(q => {
      questionLabels[q.tagId] = q.label;
    });

    const checkinId = `chk_${Date.now()}`;
    const payload: DynamicCheckinDoc = {
      id: checkinId,
      mode: 'dynamic_tags',
      answers: { ...answers },
      questionLabels,
      createdAt: new Date().toISOString(),
      dateStr: todayBr,
      patientEmail: targetPatientEmail,
      patientName: patient.name || 'Paciente'
    };

    try {
      if (isFirebaseConfigured() && db) {
        const checkinRef = doc(db, 'patients', targetPatientEmail, 'checkins', checkinId);
        await setDoc(checkinRef, payload);
        setIsCloudSynced(true);
      }
      setLatestDynamicCheckin(payload);
      setSubmittedConfirmation(true);
      setIsModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar check-in dinâmico:', err);
      setSubmitError('Não foi possível enviar suas respostas agora. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOptionStyles = (key: string, isSelected: boolean): string => {
    if (!isSelected) {
      return 'bg-white/[0.04] hover:bg-white/[0.08] border-white/20 text-[#e8eef5]';
    }
    switch (key) {
      case 'declinio':
        return 'bg-rose-500/20 border-rose-400 text-rose-200 shadow-md shadow-rose-500/15';
      case 'estavel':
        return 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/15';
      case 'em_melhora':
        return 'bg-emerald-500/20 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/15';
      case 'recuperado_100':
        return 'bg-[#5eea8f]/25 border-[#5eea8f] text-[#5eea8f] shadow-md shadow-[#5eea8f]/20';
      default:
        return 'bg-[#5eea8f]/20 border-[#5eea8f] text-[#5eea8f]';
    }
  };

  const getStatusBadgeClasses = (percent: number, label?: string): string => {
    const lower = (label || '').toLowerCase();
    if (percent > 0 || /melhora|recuperad|ótimo|evolu/i.test(lower)) {
      return 'bg-[#10b981]/15 border-[#10b981]/35 text-[#10b981]';
    }
    if (percent < 0 || /decl[ií]nio|piora|aten[çc][ãa]o/i.test(lower)) {
      return 'bg-[#f43f5e]/15 border-[#f43f5e]/35 text-[#f43f5e]';
    }
    return 'bg-[#fbbf24]/15 border-[#fbbf24]/35 text-[#fbbf24]';
  };

  const getProgressBarColorClass = (percent: number): string => {
    if (percent > 0) return 'bg-gradient-to-r from-[#059669] via-[#10b981] to-[#5eea8f]';
    if (percent < 0) return 'bg-gradient-to-r from-[#be123c] to-[#f43f5e]';
    return 'bg-gradient-to-r from-[#d97706] to-[#fbbf24]';
  };

  const getPercentTextColor = (percent: number): string => {
    if (percent > 0) return 'text-[#10b981]';
    if (percent < 0) return 'text-[#f43f5e]';
    return 'text-[#fbbf24]';
  };

  const formatSignedPercent = (val: number): string => {
    if (val > 0) return `+${val}%`;
    return `${val}%`;
  };

  const answeredCount = activeQuestions.filter(q => Boolean(answers[q.tagId])).length;

  return (
    <div className="space-y-4 select-none animate-fadeIn font-['Plus_Jakarta_Sans',sans-serif] w-full pb-4">
      {/* Cabeçalho da Aba */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-[23px] font-['Cormorant_Garamond',serif] font-bold tracking-[0.02em] text-[#5eea8f] leading-tight">
          Meu Bem Estar
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isCloudSynced && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#5eea8f]/10 border border-[#5eea8f]/25 text-[#5eea8f] text-[11.5px] font-semibold">
              <CloudCheck className="w-3.5 h-3.5 text-[#5eea8f]" />
              <span className="hidden xs:inline">Nuvem</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/15 text-[12.5px] font-semibold text-[#e8f5f0] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#5eea8f] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* Cartão "REALIZAR AGORA" para iniciar Check-in Dinâmico */}
      <div className="bg-gradient-to-br from-[#1c1838] via-[#121124] to-[#0d0d16] border border-[#7c6af7]/35 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-[#5eea8f]/15 border border-[#5eea8f]/30 flex items-center justify-center text-[#5eea8f] shrink-0 mt-0.5">
            <Calendar className="w-6 h-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[17px] sm:text-[18px] font-bold text-[#5eea8f] uppercase tracking-wide flex items-center flex-wrap gap-2">
              <span>REALIZAR AGORA</span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[#5eea8f]/20 border border-[#5eea8f]/40 text-white text-[15px] font-bold tracking-normal tabular-nums">
                {todayBr}
              </span>
            </div>
            <div className="text-[14.5px] text-[#cfd3dc] mt-1 font-medium leading-snug">
              Referente ao período desde o último registro
            </div>
            {activeQuestions.length > 0 && (
              <div className="text-[12.5px] text-[#8b98a6] mt-0.5">
                {activeQuestions.length} {activeQuestions.length === 1 ? 'sintoma ativo para avaliação' : 'sintomas ativos para avaliação'}
                {latestAnyCheckinDate ? ` • Último envio: ${latestAnyCheckinDate}` : ''}
              </div>
            )}
          </div>
        </div>

        {isAwaitingCrmSync && (
          <div className="p-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/35 flex items-start gap-2.5 text-left animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-[#10b981] shrink-0 mt-0.5" />
            <div className="text-[13.5px] text-[#d1fae5] leading-snug">
              <strong className="font-semibold text-white">Check-in registrado com sucesso!</strong> Suas respostas foram salvas e serão consolidadas na matriz de evolução pelo acompanhamento clínico.
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleOpenModal}
          className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-[#0f7a3a] to-[#108c43] hover:from-[#139247] hover:to-[#0f7a3a] border border-[#5eea8f]/40 text-white font-bold text-[17px] shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center"
        >
          <span>{isAwaitingCrmSync ? 'Responder Novamente' : 'Iniciar Check-in'}</span>
        </button>
      </div>

      {/* Divisória */}
      <div className="border-t border-white/15 my-2"></div>

      {/* ===================================================================== */}
      {/* TABELA LONGITUDINAL DE EVOLUÇÃO EM COLUNAS (%)                        */}
      {/* ===================================================================== */}
      <div className="bg-[#0d101b] border border-white/15 rounded-2xl overflow-hidden shadow-md">
        <div className="px-3.5 py-3 border-b border-white/10 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-5 h-5 text-[#5eea8f] shrink-0" />
            <h2 className="text-[16.5px] font-bold text-white leading-tight">
              Evolução Longitudinal (%)
            </h2>
          </div>
          {encounters.length > 0 && (
            <span className="text-[11.5px] text-[#8b98a6] whitespace-nowrap shrink-0">
              {encounters.length} {encounters.length === 1 ? 'marco' : 'marcos'}
            </span>
          )}
        </div>

        {needsMatrix.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-[15.5px] font-semibold text-[#e8eef5] mb-1">
              Matriz de evolução em preparação
            </div>
            <p className="text-[13.5px] text-[#8b98a6] leading-relaxed max-w-[300px] mx-auto">
              Assim que suas necessidades clínicas forem registradas no acompanhamento e os check-ins forem sincronizados, os percentuais aparecerão nesta tabela.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto no-scrollbar">
            <table className="w-full border-collapse text-left tabular-nums">
              <thead>
                <tr className="border-b border-white/10 bg-[#0d101b]">
                  <th
                    scope="col"
                    className="sticky left-0 z-20 bg-[#0d101b] px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-wider text-[#94a3b8] min-w-[116px] max-w-[134px] border-r border-white/10"
                  >
                    Sintoma
                  </th>

                  {encounters.map((enc) => (
                    <th
                      key={enc.id}
                      scope="col"
                      className="px-2.5 py-2.5 text-center min-w-[84px] whitespace-nowrap"
                    >
                      <div className="text-[12px] font-bold text-[#e8eef5] leading-tight">
                        {enc.label}
                      </div>
                      {enc.shortDateBr && (
                        <div className="text-[11px] font-medium text-[#8b98a6] mt-0.5">
                          {enc.shortDateBr}
                        </div>
                      )}
                    </th>
                  ))}

                  <th
                    scope="col"
                    className="sticky right-0 z-20 bg-[#0d101b] px-3 py-2.5 text-right text-[11.5px] font-bold uppercase tracking-wider text-[#5eea8f] min-w-[104px] max-w-[124px] border-l border-white/10"
                  >
                    ATUAL
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.07]">
                {needsMatrix.map((row) => {
                  const pct = row.accumulatedPercent ?? 0;

                  return (
                    <tr key={row.tagId} className="hover:bg-white/[0.02] transition-colors">
                      {/* 1ª Coluna (Fixa à Esquerda) */}
                      <td className="sticky left-0 z-10 bg-[#0d101b] px-3 py-3 text-[13px] font-semibold text-[#e8eef5] leading-snug min-w-[116px] max-w-[134px] border-r border-white/10 align-middle">
                        {row.label}
                      </td>

                      {/* Colunas Intermediárias (Encontros) */}
                      {encounters.map((enc) => {
                        const val = row.cumulativeByEncounter?.[enc.id];
                        const encInfo = row.valuesByEncounter?.[enc.id];
                        const isBaseStart =
                          enc.id === row.startEncounterId &&
                          (encInfo?.status === 'registro' || (!encInfo?.status && val === 0));

                        return (
                          <td
                            key={`${row.tagId}-${enc.id}`}
                            className="px-2.5 py-3 text-center whitespace-nowrap align-middle"
                          >
                            {val === null || val === undefined ? (
                              <span className="text-[14px] text-[#64748b] font-medium">—</span>
                            ) : isBaseStart ? (
                              <span className="inline-block px-2 py-0.5 rounded-md bg-white/[0.06] border border-white/15 text-[#cbd5e1] text-[11px] font-semibold">
                                Base (0%)
                              </span>
                            ) : (
                              <span className={`text-[13.5px] font-bold ${getPercentTextColor(val)}`}>
                                {formatSignedPercent(val)}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Última Coluna (Fixa à Direita — ATUAL) */}
                      <td className="sticky right-0 z-10 bg-[#0d101b] px-3 py-3 text-right min-w-[104px] max-w-[124px] border-l border-white/10 align-middle">
                        {row.awaitingFirstEvaluation ? (
                          <span className="inline-block px-2 py-1 rounded-md bg-white/[0.06] border border-white/15 text-[#cbd5e1] text-[10.5px] font-medium leading-tight text-center">
                            Aguardando 1º Check-in
                          </span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className={`text-[14px] font-bold leading-tight ${getPercentTextColor(pct)}`}>
                              {formatSignedPercent(pct)}
                            </span>
                            <span
                              className={`text-[11px] font-medium leading-tight mt-0.5 ${getPercentTextColor(pct)}`}
                            >
                              {row.statusLabel}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* CARD DE RODAPÉ — EVOLUÇÃO GERAL DOS SINTOMAS                          */}
      {/* ===================================================================== */}
      {overallEvolution && (
        <div className="bg-[#0d101b] border border-white/15 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[16px] font-bold text-white leading-tight">
              Evolução Geral dos Sintomas
            </h3>
            <span
              className={`px-2.5 py-1 rounded-lg border text-[12px] font-semibold whitespace-nowrap ${getStatusBadgeClasses(
                overallEvolution.averagePercent,
                overallEvolution.statusLabel
              )}`}
            >
              {overallEvolution.statusLabel}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className={`text-[30px] font-extrabold leading-none tabular-nums ${getPercentTextColor(overallEvolution.averagePercent)}`}>
              {formatSignedPercent(overallEvolution.averagePercent)}
            </div>
            <div className="text-[13px] text-[#94a3b8] font-semibold tabular-nums">
              Índice visual: <span className="text-white">{Math.round(overallEvolution.displayScore)}</span>/100
            </div>
          </div>

          <div className="h-3 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, Math.max(0, overallEvolution.displayScore))}%`
              }}
              className={`h-full rounded-full transition-all duration-500 ${getProgressBarColorClass(
                overallEvolution.averagePercent
              )}`}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL DE CHECK-IN DINÂMICO (activeCheckinQuestions)                  */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
          <div className="w-full max-w-[420px] max-h-[92vh] rounded-3xl bg-[#0f1424] border border-[#2b3558] flex flex-col overflow-hidden shadow-2xl font-['Plus_Jakarta_Sans',sans-serif]">
            {/* Cabeçalho do Modal */}
            <div className="p-4 bg-[#141b30] border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="min-w-0">
                <div className="text-[18px] font-bold text-white leading-tight">
                  Check-in de Sintomas
                </div>
                <div className="text-[13px] text-[#5eea8f] font-medium mt-0.5 tabular-nums">
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
            <div className="grow overflow-y-auto px-3 py-4 space-y-4 no-scrollbar">
              {/* Subtítulo exibido UMA única vez no topo */}
              <div className="bg-white/[0.04] border border-white/15 rounded-xl px-3.5 py-2.5 text-[15px] font-medium text-[#cfd3dc] text-center">
                Referente ao período desde o último registro
              </div>

              {activeQuestions.length === 0 ? (
                <div className="bg-[#13192c] border border-white/15 rounded-2xl p-5 text-center space-y-2.5">
                  <div className="text-[16px] font-semibold text-white">
                    Nenhuma pergunta ativa publicada
                  </div>
                  <p className="text-[13.5px] text-[#94a3b8] leading-relaxed">
                    As perguntas personalizadas do seu check-in aparecerão aqui automaticamente assim que forem liberadas pelo seu nutricionista.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 text-white text-[14px] font-semibold transition cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeQuestions.map((q, qIdx) => {
                    const options = q.options && q.options.length > 0 ? q.options : DEFAULT_STANDARD_OPTIONS;
                    const selectedKey = answers[q.tagId];

                    return (
                      <div
                        key={q.id || q.tagId}
                        className="bg-[#13192c] border border-white/20 rounded-2xl p-3.5 shadow-sm space-y-3"
                      >
                        <div>
                          <div className="text-[12px] font-semibold uppercase tracking-wider text-[#5eea8f] mb-1">
                            {String(qIdx + 1).padStart(2, '0')} · {q.label}
                          </div>
                          <div className="text-[16.5px] font-semibold text-white leading-snug">
                            {q.questionText}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {options.map((opt) => {
                            const isSelected = selectedKey === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => handleSelectOption(q.tagId, opt.key)}
                                className={`min-h-[52px] px-2.5 py-2 rounded-xl border text-[13.5px] font-bold leading-tight text-center transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center ${getOptionStyles(
                                  opt.key,
                                  isSelected
                                )}`}
                              >
                                <span>{opt.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 text-[13.5px] leading-snug text-center">
                      {submitError}
                    </div>
                  )}

                  <div className="pt-1 pb-2">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitDynamicCheckin}
                      className="w-full min-h-[50px] py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0f7a3a] via-[#129446] to-[#0f7a3a] hover:from-[#139247] hover:to-[#108c43] disabled:opacity-60 border border-[#5eea8f]/50 text-white font-bold text-[16.5px] flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                      <span>{isSubmitting ? 'Enviando...' : 'Enviar Check-in'}</span>
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
