import {
  PatientProfile,
  ProtocolItem,
  ProtocolFormula,
  ActiveIngredient,
  ExamBatch,
  PhysicalAssessmentItem,
  AssessmentComparisonMetric,
  ReferralItem,
  ClinicalEvolutionItem,
  ClinicalSummaryInfo,
  ParsedEncounterTag,
  NumberedStepItem,
  WellbeingLongitudinalData,
  CheckinQuestionItem,
  LongitudinalEncounterCol,
  LongitudinalNeedRow,
  OverallEvolutionSummary
} from '../types/patient';
import { INITIAL_PATIENTS } from '../patients/defaultPatient';
import { db, auth, isFirebaseConfigured } from '../config/firebase';
import { 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  getDocsFromServer, 
  type DocumentSnapshot 
} from 'firebase/firestore';

const STORAGE_KEY = 'vittare_patients_store_v18';

// Cache persistente em memória das subcoleções oficiais para blindagem contra sobrescrita pelo doc raiz
let cachedSubPrescriptions: ProtocolItem[] = [];
let cachedSubReferrals: ReferralItem[] = [];
let hasLoadedSubReferrals: boolean = false;
let lastReferralsError: string | null = null;
let cachedSubExamBatches: ExamBatch[] = [];
let cachedSubAssessments: PhysicalAssessmentItem[] = [];
let lastAnthroError: string | null = null;
let cachedSubEvolutions: ClinicalEvolutionItem[] = [];
let cachedRootConsultationRecords: ClinicalEvolutionItem[] = [];
let cachedResumoConsultationRecords: ClinicalEvolutionItem[] = [];
let hasLoadedSubEvolution: boolean = false;
let cachedClinicalSummaryInfo: ClinicalSummaryInfo | null = null;
let cachedWellbeingData: WellbeingLongitudinalData | null = null;
let lastEvolutionsError: string | null = null;

function parseAssessmentTimestampMs(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'object' && value !== null) {
    const maybeSeconds = (value as { seconds?: unknown }).seconds;
    if (typeof maybeSeconds === 'number' && Number.isFinite(maybeSeconds)) {
      return maybeSeconds * 1000;
    }
    const maybeToMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof maybeToMillis === 'function') {
      try {
        const ms = (value as { toMillis: () => number }).toMillis();
        return Number.isFinite(ms) ? ms : 0;
      } catch {
        return 0;
      }
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric) && /^\d+$/.test(trimmed)) {
      return numeric;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function parseAssessmentDateMs(dateStr?: string): number {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const clean = dateStr.replace(/^Data:\s*/i, '').trim();

  // Formato brasileiro DD/MM/AAAA
  const ptMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ptMatch) {
    const day = parseInt(ptMatch[1], 10);
    const month = parseInt(ptMatch[2], 10) - 1;
    const year = parseInt(ptMatch[3], 10);
    const ts = new Date(year, month, day).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  }

  // Fallback ISO AAAA-MM-DD
  const isoMatch = clean.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const ts = new Date(year, month, day).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  }

  return 0;
}

export function sortPhysicalAssessmentsDesc(items: PhysicalAssessmentItem[]): PhysicalAssessmentItem[] {
  if (!Array.isArray(items) || items.length <= 1) return Array.isArray(items) ? [...items] : [];

  return [...items].sort((a, b) => {
    const dateA = parseAssessmentDateMs(a.dateStr) || parseAssessmentTimestampMs(a.createdAt) || parseAssessmentTimestampMs(a.updatedAt);
    const dateB = parseAssessmentDateMs(b.dateStr) || parseAssessmentTimestampMs(b.createdAt) || parseAssessmentTimestampMs(b.updatedAt);

    if (dateB !== dateA) {
      return dateB - dateA;
    }

    const timeA = Math.max(parseAssessmentTimestampMs(a.updatedAt), parseAssessmentTimestampMs(a.createdAt));
    const timeB = Math.max(parseAssessmentTimestampMs(b.updatedAt), parseAssessmentTimestampMs(b.createdAt));

    if (timeB !== timeA) {
      return timeB - timeA;
    }

    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

function toCleanStringArray(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return String((item as any).text || (item as any).label || (item as any).title || (item as any).name || '').trim();
        }
        return String(item ?? '').trim();
      })
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    return val
      .split(/\r?\n|;/)
      .map((line) => line.replace(/^(\d+[\.\)\-\s]+|[-•*]\s*)/, '').trim())
      .filter(Boolean);
  }
  return [];
}

function parseStructuredSectionsFromRawText(rawText: string): {
  resumoGeral?: string;
  observacoes?: string;
  achados?: string[];
  planoDeAcao?: string[];
  proximosPassos?: string[];
} {
  if (!rawText || typeof rawText !== 'string') return {};
  const text = rawText.trim();
  if (!text) return {};

  const hasSectionHeaders = /resumo\s+geral|observa[çc][õo]es\s+pertinentes|plano\s+de\s+a[çc][ãa]o|pr[óo]ximos\s+passos/i.test(text);
  if (!hasSectionHeaders) {
    return { resumoGeral: text };
  }

  const lines = text.split(/\r?\n/);
  let currentSection: 'resumo' | 'obs' | 'achados' | 'plano' | 'passos' = 'resumo';
  const resumoLines: string[] = [];
  const obsLines: string[] = [];
  const achadosList: string[] = [];
  const planoList: string[] = [];
  const passosList: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^#*\s*resumo\s+geral\s*:?$/i.test(line)) {
      currentSection = 'resumo';
      continue;
    }
    if (/^#*\s*observa[çc][õo]es(\s+pertinentes)?\s*:?$/i.test(line)) {
      currentSection = 'obs';
      continue;
    }
    if (/^#*\s*(achados|alertas|pontos\s+de\s+aten[çc][ãa]o)\s*:?$/i.test(line)) {
      currentSection = 'achados';
      continue;
    }
    if (/^#*\s*plano\s+de\s+a[çc][ãa]o\s*:?$/i.test(line)) {
      currentSection = 'plano';
      continue;
    }
    if (/^#*\s*pr[óo]ximos\s+passos\s*:?$/i.test(line)) {
      currentSection = 'passos';
      continue;
    }

    const inlineResumo = line.match(/^resumo\s+geral\s*:\s*(.+)$/i);
    if (inlineResumo) {
      currentSection = 'resumo';
      resumoLines.push(inlineResumo[1].trim());
      continue;
    }
    const inlineObs = line.match(/^observa[çc][õo]es(\s+pertinentes)?\s*:\s*(.+)$/i);
    if (inlineObs) {
      currentSection = 'obs';
      obsLines.push(inlineObs[2].trim());
      continue;
    }

    if (currentSection === 'resumo') {
      resumoLines.push(line);
    } else if (currentSection === 'obs') {
      if (/^[-•*]\s+/.test(line)) {
        achadosList.push(line.replace(/^[-•*]\s+/, '').trim());
      } else {
        obsLines.push(line);
      }
    } else if (currentSection === 'achados') {
      achadosList.push(line.replace(/^[-•*]\s+/, '').trim());
    } else if (currentSection === 'plano') {
      planoList.push(line.replace(/^(\d+[\.\)\-\s]+|[-•*]\s*)/, '').trim());
    } else if (currentSection === 'passos') {
      passosList.push(line.replace(/^(\d+[\.\)\-\s]+|[-•*]\s*)/, '').trim());
    }
  }

  return {
    resumoGeral: resumoLines.join(' ').trim() || undefined,
    observacoes: obsLines.join(' ').trim() || undefined,
    achados: achadosList.length > 0 ? achadosList : undefined,
    planoDeAcao: planoList.length > 0 ? planoList : undefined,
    proximosPassos: passosList.length > 0 ? passosList : undefined
  };
}

export function isConsultationEncounterDoc(docId: string, data?: any): boolean {
  if (!docId && !data) return false;
  if (docId === 'resumo_geral') return false;
  const startsWithEncounter = String(docId || '').startsWith('encounter_');
  const isConsultationRecord = data?.recordType === 'consultation_record';
  if (startsWithEncounter || isConsultationRecord) {
    const hasObservations = typeof data?.pertinentObservations === 'string' && data.pertinentObservations.trim().length > 0;
    const hasLegacyObs = typeof data?.observacoes === 'string' && data.observacoes.trim().length > 0;
    const hasNextSteps = Array.isArray(data?.nextSteps) && data.nextSteps.length > 0;
    const hasNumberedSteps = Array.isArray(data?.numberedSteps) && data.numberedSteps.length > 0;
    const hasLegacySteps = Array.isArray(data?.proximosPassos) && data.proximosPassos.length > 0;
    if (data && typeof data === 'object' && ('pertinentObservations' in data || 'nextSteps' in data || 'numberedSteps' in data)) {
      return hasObservations || hasLegacyObs || hasNextSteps || hasNumberedSteps || hasLegacySteps || isConsultationRecord;
    }
    return true;
  }
  // Suporte ao modelo antigo na coleção evolution / Evolution (documentos que não são resumo_geral e possuem conteúdo clínico)
  if (data && typeof data === 'object') {
    return Boolean(
      data.pertinentObservations ||
      data.observacoes ||
      data.observacoesPertinentes ||
      data.nextSteps ||
      data.proximosPassos ||
      data.planoDeAcao ||
      data.resumoGeral ||
      data.summary ||
      data.notes ||
      data.clinicalNotes ||
      data.rawText ||
      data.text ||
      data.title ||
      data.titulo
    );
  }
  return false;
}

export function normalizeConsultationRecordsList(rawList: any): ClinicalEvolutionItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];
  const normalized = rawList
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any, idx: number) =>
      normalizeClinicalEvolution(
        {
          ...item,
          recordType: item.recordType || 'consultation_record'
        },
        item.id || `encounter_rec_${idx + 1}`
      )
    );
  return sortClinicalEvolutionsDesc(normalized);
}

export function resolveAuthoritativeConsultationRecords(
  rootRecords?: ClinicalEvolutionItem[],
  resumoRecords?: ClinicalEvolutionItem[],
  subRecords?: ClinicalEvolutionItem[]
): ClinicalEvolutionItem[] {
  if (Array.isArray(rootRecords) && rootRecords.length > 0) return rootRecords;
  if (cachedRootConsultationRecords.length > 0) return cachedRootConsultationRecords;
  if (Array.isArray(resumoRecords) && resumoRecords.length > 0) return resumoRecords;
  if (cachedResumoConsultationRecords.length > 0) return cachedResumoConsultationRecords;
  if (Array.isArray(subRecords) && subRecords.length > 0) return subRecords;
  if (cachedSubEvolutions.length > 0) return cachedSubEvolutions;
  return [];
}

export function normalizeParsedTags(rawParsedTags: any, rawAlertTags?: any): ParsedEncounterTag[] {
  const result: ParsedEncounterTag[] = [];

  if (Array.isArray(rawParsedTags) && rawParsedTags.length > 0) {
    for (const item of rawParsedTags) {
      if (!item || typeof item !== 'object') continue;
      const rawStr = String(item.raw || '').trim();
      const label = String(item.label || rawStr || '').trim();
      if (!label) continue;

      const rawSymbol = String(item.symbol || '').trim();
      let symbol: '↔' | '↑' | '↓' = '↔';
      if (rawSymbol === '↑' || rawStr.includes('↑')) symbol = '↑';
      else if (rawSymbol === '↓' || rawStr.includes('↓')) symbol = '↓';
      else if (rawSymbol === '↔' || rawStr.includes('↔')) symbol = '↔';
      else if (item.color === 'red') symbol = '↑';

      const color: 'green' | 'red' =
        item.color === 'green' || item.color === 'red'
          ? item.color
          : (symbol === '↔' ? 'green' : 'red');

      const status = String(
        item.status || (color === 'green' ? 'Normal / Melhora' : symbol === '↓' ? 'Queda' : 'Aumento')
      ).trim();

      result.push({
        raw: rawStr || `${label} ${symbol} ${status}`.trim(),
        label,
        symbol,
        status,
        color
      });
    }
  } else {
    const strTags = toCleanStringArray(rawAlertTags);
    for (const tagStr of strTags) {
      let symbol: '↔' | '↑' | '↓' = '↔';
      let color: 'green' | 'red' = 'green';
      let label = tagStr;
      let status = 'Normal / Melhora';

      if (tagStr.includes('↑')) {
        symbol = '↑';
        color = 'red';
        const parts = tagStr.split('↑').map(s => s.trim());
        label = parts[0] || tagStr;
        status = parts[1] || 'Aumento';
      } else if (tagStr.includes('↓')) {
        symbol = '↓';
        color = 'red';
        const parts = tagStr.split('↓').map(s => s.trim());
        label = parts[0] || tagStr;
        status = parts[1] || 'Queda';
      } else if (tagStr.includes('↔')) {
        symbol = '↔';
        color = 'green';
        const parts = tagStr.split('↔').map(s => s.trim());
        label = parts[0] || tagStr;
        status = parts[1] || 'Estável';
      } else {
        const lower = tagStr.toLowerCase();
        if (/elevad|alto|aument|alterad|aten[çc][ãa]o|piora|decl[ií]nio/.test(lower)) {
          symbol = '↑';
          color = 'red';
          status = 'Aumento';
        } else if (/reduzid|baix|queda|defici[êe]ncia/.test(lower)) {
          symbol = '↓';
          color = 'red';
          status = 'Queda';
        }
      }

      result.push({
        raw: tagStr,
        label,
        symbol,
        status,
        color
      });
    }
  }

  // Ordenar sempre mantendo tags verdes (↔) primeiro e vermelhas (↑ / ↓) depois
  const greens = result.filter(t => t.color === 'green');
  const reds = result.filter(t => t.color !== 'green');
  return [...greens, ...reds];
}

export function normalizeNumberedSteps(rawNumbered: any, rawSteps?: any): NumberedStepItem[] {
  if (Array.isArray(rawNumbered) && rawNumbered.length > 0) {
    const mapped = rawNumbered
      .map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return {
            number: String(idx + 1).padStart(2, '0'),
            text: item.trim()
          };
        }
        return {
          number: String(item?.number || String(idx + 1).padStart(2, '0')).trim(),
          text: String(item?.text || item?.label || item?.title || '').trim()
        };
      })
      .filter((s: NumberedStepItem) => s.text.length > 0);
    if (mapped.length > 0) return mapped;
  }

  const list = toCleanStringArray(rawSteps);
  return list.map((text, idx) => ({
    number: String(idx + 1).padStart(2, '0'),
    text
  }));
}

export function normalizeClinicalEvolution(raw: any, idFallback: string): ClinicalEvolutionItem {
  const dateIso = typeof raw?.date === 'string' && raw.date.trim() ? raw.date.trim() : undefined;
  const createdMs = parseAssessmentTimestampMs(raw?.createdAt || raw?.timestamp || dateIso);
  const updatedMs = parseAssessmentTimestampMs(raw?.updatedAt);
  const rawDate =
    raw?.dateStr ||
    raw?.date ||
    raw?.data ||
    (createdMs > 0 ? new Date(createdMs).toLocaleDateString('pt-BR') : '16/11/2026');

  const cleanDate = String(rawDate).replace(/^Data:\s*/i, '').trim();
  const formattedDate = cleanDate.includes('-') && /^\d{4}-\d{2}-\d{2}/.test(cleanDate)
    ? cleanDate.slice(0, 10).split('-').reverse().join('/')
    : cleanDate;

  const rawTextBody =
    typeof raw?.rawText === 'string'
      ? raw.rawText
      : typeof raw?.text === 'string'
      ? raw.text
      : typeof raw?.content === 'string'
      ? raw.content
      : typeof raw?.notes === 'string'
      ? raw.notes
      : typeof raw?.clinicalNotes === 'string'
      ? raw.clinicalNotes
      : '';

  const parsedFromText = parseStructuredSectionsFromRawText(rawTextBody);

  const resumoGeral =
    (typeof (raw?.resumoGeral ?? raw?.resumo ?? raw?.summary ?? raw?.generalSummary) === 'string'
      ? String(raw?.resumoGeral ?? raw?.resumo ?? raw?.summary ?? raw?.generalSummary).trim()
      : '') ||
    parsedFromText.resumoGeral ||
    '';

  const pertinentObservations =
    (typeof (raw?.pertinentObservations ?? raw?.observacoesPertinentes ?? raw?.observacoes ?? raw?.observations) === 'string'
      ? String(raw?.pertinentObservations ?? raw?.observacoesPertinentes ?? raw?.observacoes ?? raw?.observations).trim()
      : '') ||
    parsedFromText.observacoes ||
    '';

  const explicitAlertTags = toCleanStringArray(
    raw?.alertTags ?? raw?.achados ?? raw?.findings ?? raw?.alertas ?? raw?.alerts ?? raw?.pontosDeAtencao
  );
  const alertTags = explicitAlertTags.length > 0 ? explicitAlertTags : (parsedFromText.achados || []);
  const parsedTags = normalizeParsedTags(raw?.parsedTags, alertTags);

  const explicitNextSteps = toCleanStringArray(
    raw?.nextSteps ?? raw?.predictability ?? raw?.proximosPassos ?? raw?.proximos_passos ?? raw?.steps ?? raw?.passos
  );
  const explicitPlano = toCleanStringArray(
    raw?.planoDeAcao ?? raw?.plano_acao ?? raw?.actionPlan ?? raw?.actions ?? raw?.plano
  );
  const fallbackSteps =
    explicitNextSteps.length > 0
      ? explicitNextSteps
      : (parsedFromText.proximosPassos && parsedFromText.proximosPassos.length > 0
          ? parsedFromText.proximosPassos
          : (explicitPlano.length > 0 ? explicitPlano : (parsedFromText.planoDeAcao || [])));

  const numberedSteps = normalizeNumberedSteps(raw?.numberedSteps, fallbackSteps);

  const tags = toCleanStringArray(raw?.tags ?? raw?.tipos ?? raw?.recordTypes ?? raw?.tipoRegistro);

  return {
    id: String(raw?.id || idFallback),
    encounterId: raw?.encounterId ? String(raw.encounterId) : undefined,
    recordType: raw?.recordType ? String(raw.recordType) : undefined,
    title: String(raw?.title || raw?.titulo || 'Registro de Consulta').trim(),
    date: dateIso,
    dateStr: formattedDate,
    pertinentObservations: pertinentObservations || undefined,
    alertTags,
    parsedTags,
    nextSteps: explicitNextSteps.length > 0 ? explicitNextSteps : numberedSteps.map(s => s.text),
    predictability: toCleanStringArray(raw?.predictability),
    numberedSteps,
    resumoGeral: resumoGeral || undefined,
    observacoes: pertinentObservations || undefined,
    achados: alertTags,
    planoDeAcao: explicitPlano,
    proximosPassos: explicitNextSteps,
    rawText: rawTextBody || undefined,
    tags: tags.length > 0 ? tags : undefined,
    createdAt: createdMs > 0 ? createdMs : undefined,
    updatedAt: updatedMs > 0 ? updatedMs : undefined
  };
}

export function sortClinicalEvolutionsDesc(items: ClinicalEvolutionItem[]): ClinicalEvolutionItem[] {
  if (!Array.isArray(items) || items.length <= 1) return Array.isArray(items) ? [...items] : [];

  return [...items].sort((a, b) => {
    const timeA =
      parseAssessmentTimestampMs(a.date) ||
      parseAssessmentTimestampMs(a.updatedAt) ||
      parseAssessmentDateMs(a.dateStr) ||
      parseAssessmentTimestampMs(a.createdAt);
    const timeB =
      parseAssessmentTimestampMs(b.date) ||
      parseAssessmentTimestampMs(b.updatedAt) ||
      parseAssessmentDateMs(b.dateStr) ||
      parseAssessmentTimestampMs(b.createdAt);

    if (timeB !== timeA) {
      return timeB - timeA;
    }

    const updatedA = Math.max(parseAssessmentTimestampMs(a.updatedAt), parseAssessmentTimestampMs(a.createdAt));
    const updatedB = Math.max(parseAssessmentTimestampMs(b.updatedAt), parseAssessmentTimestampMs(b.createdAt));

    if (updatedB !== updatedA) {
      return updatedB - updatedA;
    }

    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

export function extractConsultationRecordsFromResumoGeral(resumoData?: any): ClinicalEvolutionItem[] {
  if (!resumoData || typeof resumoData !== 'object') return [];

  if (Array.isArray(resumoData.consultationRecords) && resumoData.consultationRecords.length > 0) {
    return normalizeConsultationRecordsList(resumoData.consultationRecords);
  }
  if (Array.isArray(resumoData.records) && resumoData.records.length > 0) {
    return normalizeConsultationRecordsList(resumoData.records);
  }
  if (Array.isArray(resumoData.evolutions) && resumoData.evolutions.length > 0) {
    return normalizeConsultationRecordsList(resumoData.evolutions);
  }

  // Caso o documento /evolution/resumo_geral contenha diretamente os campos de uma anotação de consulta
  const rawSummary = String(resumoData.summary || resumoData.resumoGeral || '').trim();
  const isLegacyDeclinioOnly = /^decl[ií]nio\b/i.test(rawSummary);
  const hasDirectObservations = Boolean(
    (resumoData.pertinentObservations || resumoData.observacoes || resumoData.observacoesPertinentes || (!isLegacyDeclinioOnly ? rawSummary : '')).trim()
  );
  const hasDirectSteps = Boolean(
    (Array.isArray(resumoData.nextSteps) && resumoData.nextSteps.length > 0) ||
    (Array.isArray(resumoData.numberedSteps) && resumoData.numberedSteps.length > 0) ||
    (Array.isArray(resumoData.proximosPassos) && resumoData.proximosPassos.length > 0) ||
    (Array.isArray(resumoData.planoDeAcao) && resumoData.planoDeAcao.length > 0)
  );
  const hasDirectTags = Boolean(
    (Array.isArray(resumoData.parsedTags) && resumoData.parsedTags.length > 0) ||
    (Array.isArray(resumoData.alertTags) && resumoData.alertTags.length > 0) ||
    (Array.isArray(resumoData.achados) && resumoData.achados.length > 0)
  );

  if (hasDirectObservations || hasDirectSteps || hasDirectTags) {
    return [
      normalizeClinicalEvolution(
        {
          ...resumoData,
          pertinentObservations:
            resumoData.pertinentObservations ||
            resumoData.observacoes ||
            resumoData.observacoesPertinentes ||
            (!isLegacyDeclinioOnly ? rawSummary : ''),
          recordType: 'consultation_record'
        },
        'encounter_resumo_geral'
      )
    ];
  }

  return [];
}

export function buildLegacyFallbackEncountersFromRoot(_rootRaw?: any): ClinicalEvolutionItem[] {
  // Desativado: a aba Anotações deve refletir exclusivamente o que está gravado no Firebase (/evolution/resumo_geral e /evolution)
  return [];
}

export function normalizeWellbeingData(resumoRaw: any, rootRaw?: any): WellbeingLongitudinalData | null {
  const rawQuestions =
    Array.isArray(resumoRaw?.activeCheckinQuestions) && resumoRaw.activeCheckinQuestions.length > 0
      ? resumoRaw.activeCheckinQuestions
      : (Array.isArray(rootRaw?.activeCheckinQuestions) ? rootRaw.activeCheckinQuestions : []);

  // Quando resumo_geral é deletado para recomeçar, priorizamos exclusivamente os encontros e matriz de resumoRaw
  const rawEncounters =
    Array.isArray(resumoRaw?.encounters) && resumoRaw.encounters.length > 0
      ? resumoRaw.encounters
      : (resumoRaw && Array.isArray(resumoRaw?.longitudinalEncounters)
          ? resumoRaw.longitudinalEncounters
          : (!hasLoadedSubEvolution && Array.isArray(rootRaw?.longitudinalEncounters)
              ? rootRaw.longitudinalEncounters
              : []));

  const rawNeedsMatrix =
    Array.isArray(resumoRaw?.needsMatrix) && resumoRaw.needsMatrix.length > 0
      ? resumoRaw.needsMatrix
      : (resumoRaw && Array.isArray(resumoRaw?.longitudinalNeedsMatrix)
          ? resumoRaw.longitudinalNeedsMatrix
          : (!hasLoadedSubEvolution && Array.isArray(rootRaw?.longitudinalNeedsMatrix)
              ? rootRaw.longitudinalNeedsMatrix
              : []));

  const rawClinicalStatusMap =
    Array.isArray(resumoRaw?.clinicalStatusMap) && resumoRaw.clinicalStatusMap.length > 0
      ? resumoRaw.clinicalStatusMap
      : (Array.isArray(rootRaw?.clinicalStatusMap) ? rootRaw.clinicalStatusMap : []);

  const rawOverall = resumoRaw?.overallEvolution || rootRaw?.overallEvolution || null;

  if (
    rawQuestions.length === 0 &&
    rawEncounters.length === 0 &&
    rawNeedsMatrix.length === 0 &&
    rawClinicalStatusMap.length === 0 &&
    !rawOverall
  ) {
    return null;
  }

  const activeCheckinQuestions: CheckinQuestionItem[] = rawQuestions
    .filter((q: any) => q && typeof q === 'object')
    .map((q: any, idx: number) => ({
      id: String(q.id || q.tagId || `q-${idx + 1}`),
      tagId: String(q.tagId || q.id || `tag-${idx + 1}`),
      label: String(q.label || q.name || 'Sintoma / Necessidade').trim(),
      questionText: String(q.questionText || q.text || `Como está a evolução de "${q.label || 'atual'}" desde o último registro?`).trim(),
      options: Array.isArray(q.options)
        ? q.options.map((opt: any) => ({
            key: String(opt?.key || ''),
            label: String(opt?.label || ''),
            ...(typeof (opt?.deltaPercent ?? opt?.defaultDelta) === 'number'
              ? { deltaPercent: Number(opt?.deltaPercent ?? opt?.defaultDelta) }
              : {})
          }))
        : undefined
    }));

  let encounters: LongitudinalEncounterCol[] = rawEncounters
    .filter((enc: any) => enc && typeof enc === 'object')
    .map((enc: any, idx: number) => ({
      id: String(enc.id || `enc-${idx + 1}`),
      label: String(enc.label || `${idx + 1}º Enc.`).trim(),
      shortDateBr: enc.shortDateBr ? String(enc.shortDateBr).trim() : undefined,
      date: enc.date ? String(enc.date).trim() : undefined
    }));

  // Se não houver encontros gravados em resumo_geral, cria apenas o marco BASE (sem inventar check-ins falsos)
  if (encounters.length === 0 && (activeCheckinQuestions.length > 0 || rawClinicalStatusMap.length > 0)) {
    encounters = [
      { id: 'enc_base', label: 'BASE' }
    ];
  }

  let needsMatrix: LongitudinalNeedRow[] = rawNeedsMatrix
    .filter((row: any) => row && typeof row === 'object')
    .map((row: any, idx: number) => {
      const cumMap: Record<string, number | null> = {};
      if (row.cumulativeByEncounter && typeof row.cumulativeByEncounter === 'object') {
        for (const [k, v] of Object.entries(row.cumulativeByEncounter)) {
          cumMap[k] = typeof v === 'number' && Number.isFinite(v) ? v : null;
        }
      }
      return {
        tagId: String(row.tagId || row.id || `need-${idx + 1}`),
        label: String(row.label || 'Necessidade').trim(),
        startEncounterId: row.startEncounterId ? String(row.startEncounterId) : undefined,
        cumulativeByEncounter: cumMap,
        valuesByEncounter:
          row.valuesByEncounter && typeof row.valuesByEncounter === 'object' ? row.valuesByEncounter : undefined,
        awaitingFirstEvaluation: Boolean(row.awaitingFirstEvaluation),
        accumulatedPercent: typeof row.accumulatedPercent === 'number' && Number.isFinite(row.accumulatedPercent)
          ? row.accumulatedPercent
          : 0,
        statusLabel: String(row.statusLabel || (row.awaitingFirstEvaluation ? 'Aguardando 1º Check-in' : 'Estável')).trim()
      };
    });

  // Se não houver needsMatrix em resumo_geral, inicializa as linhas baseadas nas perguntas ativas (em estado Base 0% / Aguardando 1º Check-in)
  if (needsMatrix.length === 0 && (activeCheckinQuestions.length > 0 || rawClinicalStatusMap.length > 0)) {
    const baseEncId = encounters[0]?.id || 'enc_base';
    const sourceItems = activeCheckinQuestions.length > 0 ? activeCheckinQuestions : rawClinicalStatusMap;
    needsMatrix = sourceItems
      .filter((item: any) => item && typeof item === 'object' && item.label)
      .map((item: any, idx: number) => {
        const tagId = String(item.tagId || item.id || `tag-${idx + 1}`);
        return {
          tagId,
          label: String(item.label).trim(),
          startEncounterId: baseEncId,
          cumulativeByEncounter: {
            [baseEncId]: 0
          },
          valuesByEncounter: {
            [baseEncId]: { status: 'registro', deltaPercent: 0, cumulativePercent: 0 }
          },
          awaitingFirstEvaluation: true,
          accumulatedPercent: 0,
          statusLabel: 'Aguardando 1º Check-in'
        };
      });
  }

  const overallEvolution: OverallEvolutionSummary | undefined = rawOverall && typeof rawOverall === 'object'
    ? {
        averagePercent: Number(rawOverall.averagePercent ?? 0),
        displayScore: Number(rawOverall.displayScore ?? 0),
        statusLabel: String(rawOverall.statusLabel || 'Estável').trim()
      }
    : undefined;

  return {
    activeCheckinQuestions,
    encounters,
    needsMatrix,
    overallEvolution,
    updatedAt: resumoRaw?.updatedAt || rootRaw?.updatedAt || rootRaw?.lastSyncTimestamp
  };
}

export function mergeWellbeingData(
  primary?: WellbeingLongitudinalData | null,
  secondary?: WellbeingLongitudinalData | null
): WellbeingLongitudinalData | undefined {
  if (!primary && !secondary) return undefined;
  if (!primary) return secondary || undefined;
  if (!secondary) return primary;

  return {
    activeCheckinQuestions:
      primary.activeCheckinQuestions.length > 0
        ? primary.activeCheckinQuestions
        : secondary.activeCheckinQuestions,
    encounters:
      primary.encounters.length > 0 ? primary.encounters : secondary.encounters,
    needsMatrix:
      primary.needsMatrix.length > 0 ? primary.needsMatrix : secondary.needsMatrix,
    overallEvolution: primary.overallEvolution || secondary.overallEvolution,
    updatedAt: primary.updatedAt || secondary.updatedAt
  };
}

export function normalizeClinicalSummary(raw: any, fallbackDate?: string): ClinicalSummaryInfo | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    return {
      id: 'resumo_geral',
      summary: trimmed,
      dateStr: fallbackDate || new Date().toLocaleDateString('pt-BR')
    };
  }
  const summaryText = String(
    raw?.summary ?? raw?.resumoGeral ?? raw?.resumo ?? raw?.clinicalSummary ?? raw?.text ?? ''
  ).trim();
  if (!summaryText) return null;

  const updatedMs = parseAssessmentTimestampMs(raw?.updatedAt || raw?.createdAt);
  const rawDate = raw?.dateStr || raw?.date || raw?.data || (updatedMs > 0 ? new Date(updatedMs).toLocaleDateString('pt-BR') : (fallbackDate || ''));
  const cleanDate = String(rawDate).replace(/^Data:\s*/i, '').trim();
  const formattedDate = cleanDate.includes('-') && /^\d{4}-\d{2}-\d{2}/.test(cleanDate)
    ? cleanDate.slice(0, 10).split('-').reverse().join('/')
    : (cleanDate || fallbackDate || '');

  return {
    id: String(raw?.id || 'resumo_geral'),
    summary: summaryText,
    dateStr: formattedDate,
    updatedAt: raw?.updatedAt || (updatedMs > 0 ? updatedMs : undefined)
  };
}

/**
 * Parser de Gramática Clínica e Expressões Médicas:
 * Decompõe strings agregadas de prescrição do CRM (ex: "Formula: Chlorella (200 mg), Quitosana (50 mg)...")
 * ou arrays heterogêneos de itens em pares fortemente tipados de { name, concentration }.
 */
export function parseClinicalItemsToActives(rawItems: any): ActiveIngredient[] {
  if (!rawItems) return [];
  const list = Array.isArray(rawItems)
    ? rawItems
    : (typeof rawItems === 'object' ? Object.values(rawItems) : [rawItems]);

  const actives: ActiveIngredient[] = [];

  for (const item of list) {
    if (!item) continue;
    if (typeof item === 'object') {
      const name = item.name || item.ativo || item.nome || item.composto || item.substancia || '';
      const concentration = item.concentration || item.dosagem || item.concentracao || item.dose || item.valor || '';
      if (name) {
        actives.push({
          name: String(name).trim(),
          concentration: String(concentration).trim()
        });
      }
      continue;
    }

    if (typeof item === 'string') {
      let text = item.trim();
      // Se houver prefixo de fórmula clínica (ex: "Formula Farmácia Manipulação: ...")
      if (text.includes(':')) {
        const colonIdx = text.indexOf(':');
        const afterColon = text.slice(colonIdx + 1).trim();
        if (afterColon.length > 0) {
          text = afterColon;
        }
      }

      // Regex para capturar padrões médicos "Nome do Composto (Dosagem e Unidade)"
      // Ancorado especificamente no último grupo de parênteses com valores numéricos de dose
      const activeRegex = /(.*?)\s*\(([\d\.]+\s*[a-zA-Z%µmcg\s]+)\)(?:[,\;]|\s*$)/g;
      let matched = false;
      let m: RegExpExecArray | null;
      while ((m = activeRegex.exec(text)) !== null) {
        const cleanName = m[1].replace(/^[,\;\s\-\•\*\d+\.]+/g, '').trim();
        const cleanConc = m[2].trim();
        if (cleanName) {
          actives.push({ name: cleanName, concentration: cleanConc });
          matched = true;
        }
      }

      // Fallback para itens separados por vírgula ou hífen sem unidade expressa em parênteses
      if (!matched && text) {
        const parts = text.split(/[,\;\n]/).map(s => s.trim()).filter(Boolean);
        for (const part of parts) {
          const dashMatch = part.match(/^(.*?)\s*[\-\–\:]\s*(.*)$/);
          if (dashMatch) {
            actives.push({
              name: dashMatch[1].replace(/^[,\;\s\-\•\*\d+\.]+/g, '').trim(),
              concentration: dashMatch[2].trim()
            });
          } else {
            actives.push({
              name: part.replace(/^[,\;\s\-\•\*\d+\.]+/g, '').trim(),
              concentration: ''
            });
          }
        }
      }
    }
  }

  return actives;
}

/**
 * Normalizador polimórfico de ativos farmacêuticos e suplementos.
 * Converte arrays nativos, dicionários indexados ({ "0": {...} }) ou strings brutas em objetos padronizados.
 */
export function safeExtractActives(raw: any): ActiveIngredient[] {
  if (!raw) return [];
  return parseClinicalItemsToActives(raw);
}

/**
 * Normalizador polimórfico de fórmulas de prescrição manipuladas.
 * Converte arrays ou mapas de fórmulas e extrai seus ativos clínicos com segurança.
 */
export function safeExtractFormulas(
  rawFormulas: any,
  fallbackName?: string,
  fallbackPosology?: string,
  fallbackObs?: string,
  fallbackActives: ActiveIngredient[] = []
): ProtocolFormula[] {
  let list: any[] = [];
  if (Array.isArray(rawFormulas)) {
    list = rawFormulas;
  } else if (rawFormulas && typeof rawFormulas === 'object') {
    list = Object.values(rawFormulas);
  }

  if (list.length > 0) {
    return list.map((f: any, idx: number) => {
      const fActives = safeExtractActives(f.actives || f.ativos || f.itens || f.itensPrescritos);
      const resolvedActives = fActives.length > 0 ? fActives : fallbackActives;
      const rawTitle = f.name || f.formulaName || fallbackName || `Fórmula ${idx + 1}`;
      const cleanTitle = String(rawTitle).replace(/^\d+[\.\-\s]+/, '').trim();

      return {
        id: f.id || `form-${idx + 1}`,
        name: cleanTitle || `Fórmula ${idx + 1}`,
        posology: f.posology || f.modoDeUso || fallbackPosology || 'Tomar conforme orientação clínica.',
        observations: f.observations || f.obsClinica || fallbackObs || '',
        actives: resolvedActives
      };
    });
  }

  if (fallbackActives.length > 0) {
    const rawTitle = fallbackName || 'Formula Farmácia Manipulação';
    const cleanTitle = String(rawTitle).replace(/^\d+[\.\-\s]+/, '').trim();
    return [{
      id: 'form-1',
      name: cleanTitle || 'Formula Farmácia Manipulação',
      posology: fallbackPosology || 'Tomar conforme orientação clínica.',
      observations: fallbackObs || '',
      actives: fallbackActives
    }];
  }

  return [];
}

/**
 * Helper para validar se uma lista de protocolos possui ativos clínicos associados.
 */
export function hasProtocolActives(list?: ProtocolItem[]): boolean {
  return Array.isArray(list) && list.some(p => 
    (p.actives && p.actives.length > 0) || 
    (p.formulas && p.formulas.some(f => f.actives && f.actives.length > 0))
  );
}

/**
 * Resolvedor autoritativo de protocolos:
 * Prioriza a subcoleção de prescrições oficiais caso contenha ativos reais.
 */
export function resolveAuthoritativeProtocols(
  remoteProts?: ProtocolItem[], 
  localProts?: ProtocolItem[]
): ProtocolItem[] {
  if (hasProtocolActives(cachedSubPrescriptions)) {
    return cachedSubPrescriptions;
  }
  if (hasProtocolActives(remoteProts)) {
    return remoteProts!;
  }
  if (hasProtocolActives(localProts)) {
    return localProts!;
  }
  return (remoteProts && remoteProts.length > 0) ? remoteProts : (localProts || []);
}

/**
 * Escudo Defensivo de Dados (Sanitização profunda contra 'Tela Branca'):
 * Garante que payloads parciais ou nós nulos/undefined enviados pelo CRM Mãe
 * sejam convertidos para estruturas válidas (arrays vazios e objetos default),
 * prevenindo erros do tipo 'TypeError: Cannot read properties of null (reading map)'.
 */
export function sanitizePatientPayload(raw: any, fallbackId: string = 'paciente-template-01'): PatientProfile {
  const fallback = INITIAL_PATIENTS[fallbackId] || INITIAL_PATIENTS['paciente-template-01'] || INITIAL_PATIENTS[Object.keys(INITIAL_PATIENTS)[0]];
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  // Nome inteligente: se o payload não trouxe nome ou veio 'Paciente', tenta displayName do Auth ou formata a partir do e-mail
  const derivedName = (() => {
    if (typeof raw.name === 'string' && raw.name.trim() && raw.name !== 'Paciente') {
      return raw.name.trim();
    }
    if (auth?.currentUser?.displayName && auth.currentUser.displayName.trim()) {
      return auth.currentUser.displayName.trim();
    }
    const emailToUse = (typeof raw.email === 'string' && raw.email) || auth?.currentUser?.email;
    if (emailToUse && emailToUse.includes('@')) {
      const username = emailToUse.split('@')[0].replace(/[._-]/g, ' ');
      return username
        .split(' ')
        .filter(Boolean)
        .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    return fallback.name || 'Paciente';
  })();

  const derivedInitials = (() => {
    if (typeof raw.initials === 'string' && raw.initials.trim()) {
      return raw.initials.trim().toUpperCase();
    }
    if (derivedName && derivedName !== 'Paciente') {
      const parts = derivedName.split(' ').filter(Boolean);
      return parts.slice(0, 2).map((p: string) => p[0].toUpperCase()).join('');
    }
    return fallback.initials || 'PV';
  })();

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallback.id,
    name: derivedName,
    initials: derivedInitials,
    avatarUrl: raw.avatarUrl || fallback.avatarUrl || '',
    lastAccess: raw.lastAccess || fallback.lastAccess,
    email: typeof raw.email === 'string' ? raw.email : (auth?.currentUser?.email || fallback.email),
    pin: typeof raw.pin === 'string' ? raw.pin : fallback.pin,
    status: raw.status || fallback.status,
    activeDays: typeof raw.activeDays === 'number' ? raw.activeDays : fallback.activeDays,
    daysToComplete: typeof raw.daysToComplete === 'number' && raw.daysToComplete > 0 
      ? raw.daysToComplete 
      : (raw.endDate ? Math.max(0, Math.ceil((new Date(raw.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : (fallback.daysToComplete || 120)),
    totalDays: typeof raw.totalDays === 'number' && raw.totalDays > 0 ? raw.totalDays : (fallback.totalDays || 120),
    nextConsultationDate: raw.nextConsultationDate || fallback.nextConsultationDate,
    
    progress: {
      currentWeight: Number(raw.progress?.currentWeight ?? fallback.progress.currentWeight),
      initialWeight: Number(raw.progress?.initialWeight ?? fallback.progress.initialWeight),
      goalWeight: Number(raw.progress?.goalWeight ?? fallback.progress.goalWeight),
      weightDelta: Number(raw.progress?.weightDelta ?? fallback.progress.weightDelta),
      bodyFat: Number(raw.progress?.bodyFat ?? fallback.progress.bodyFat),
      bodyFatDelta: Number(raw.progress?.bodyFatDelta ?? fallback.progress.bodyFatDelta),
      energyScore: Number(raw.progress?.energyScore ?? fallback.progress.energyScore),
      energyDelta: Number(raw.progress?.energyDelta ?? fallback.progress.energyDelta),
      muscleMass: Number(raw.progress?.muscleMass ?? fallback.progress.muscleMass),
      muscleDelta: Number(raw.progress?.muscleDelta ?? fallback.progress.muscleDelta),
      waistCircumference: Number(raw.progress?.waistCircumference ?? fallback.progress.waistCircumference),
      waistDelta: Number(raw.progress?.waistDelta ?? fallback.progress.waistDelta),
      visceralFat: Number(raw.progress?.visceralFat ?? fallback.progress.visceralFat),
      visceralDelta: Number(raw.progress?.visceralDelta ?? fallback.progress.visceralDelta),
    },

    weightHistory: Array.isArray(raw.weightHistory) ? raw.weightHistory : (fallback.weightHistory || []),
    professionalNotes: typeof raw.professionalNotes === 'string' ? raw.professionalNotes : (fallback.professionalNotes || ''),
    crmGeneralNotes: typeof raw.crmGeneralNotes === 'string' ? raw.crmGeneralNotes : (fallback.crmGeneralNotes || ''),
    clinicalEvolutions: (() => {
      // Prioridade 1: patientDoc.consultationRecords espelhado diretamente no documento raiz /patients/{email}
      if (Array.isArray(raw.consultationRecords)) {
        const normRoot = normalizeConsultationRecordsList(raw.consultationRecords);
        if (normRoot.length > 0) {
          return normRoot;
        }
      }
      if (cachedRootConsultationRecords.length > 0) {
        return cachedRootConsultationRecords;
      }
      if (cachedResumoConsultationRecords.length > 0) {
        return cachedResumoConsultationRecords;
      }
      if (hasLoadedSubEvolution && cachedSubEvolutions.length > 0) {
        return cachedSubEvolutions;
      }
      const rawEvs = Array.isArray(raw.clinicalEvolutions)
        ? raw.clinicalEvolutions
        : Array.isArray(raw.evolutions)
        ? raw.evolutions
        : Array.isArray(raw.anotacoes)
        ? raw.anotacoes
        : [];
      const filteredEvs = rawEvs.filter((ev: any) =>
        isConsultationEncounterDoc(String(ev?.id || ''), ev)
      );
      if (filteredEvs.length > 0) {
        return sortClinicalEvolutionsDesc(
          filteredEvs.map((ev: any, idx: number) => normalizeClinicalEvolution(ev, ev?.id || `encounter-${idx + 1}`))
        );
      }
      if (cachedSubEvolutions.length > 0) {
        return cachedSubEvolutions;
      }
      // Adaptador para modelo intermediário do Firebase (clinicalStatusMap + consultations) enquanto consultationRecords ou evolution/encounter_* não estão disponíveis
      const legacyBuilt = buildLegacyFallbackEncountersFromRoot(raw);
      if (legacyBuilt.length > 0) {
        return legacyBuilt;
      }
      return [];
    })(),
    clinicalSummary: typeof raw.clinicalSummary === 'string' && raw.clinicalSummary.trim()
      ? raw.clinicalSummary.trim()
      : (cachedClinicalSummaryInfo?.summary || fallback.clinicalSummary || ''),
    clinicalSummaryInfo: (() => {
      if (cachedClinicalSummaryInfo && cachedClinicalSummaryInfo.summary) {
        return cachedClinicalSummaryInfo;
      }
      if (raw.clinicalSummaryInfo) {
        const norm = normalizeClinicalSummary(raw.clinicalSummaryInfo);
        if (norm) return norm;
      }
      if (typeof raw.clinicalSummary === 'string' && raw.clinicalSummary.trim()) {
        const tsDate = raw.lastSyncTimestamp ? new Date(raw.lastSyncTimestamp).toLocaleDateString('pt-BR') : '';
        return normalizeClinicalSummary(raw.clinicalSummary, raw.clinicalSummaryDate || tsDate) || undefined;
      }
      return fallback.clinicalSummaryInfo;
    })(),
    wellbeingData: (() => {
      const rootWellbeing = normalizeWellbeingData(null, raw);
      return mergeWellbeingData(cachedWellbeingData, rootWellbeing || (raw.wellbeingData as WellbeingLongitudinalData | undefined));
    })(),

    lyaNotification: {
      active: Boolean(raw.lyaNotification?.active ?? fallback.lyaNotification.active),
      sender: raw.lyaNotification?.sender || fallback.lyaNotification.sender,
      message: raw.lyaNotification?.message || fallback.lyaNotification.message,
      quickLinks: Array.isArray(raw.lyaNotification?.quickLinks) ? raw.lyaNotification.quickLinks : fallback.lyaNotification.quickLinks,
      acknowledgedTabs: Array.isArray(raw.lyaNotification?.acknowledgedTabs) ? raw.lyaNotification.acknowledgedTabs : (fallback.lyaNotification.acknowledgedTabs || []),
    },

    activities: Array.isArray(raw.activities) ? raw.activities : (fallback.activities || []),
    consultations: Array.isArray(raw.consultations)
      ? raw.consultations.map((c: any, idx: number) => ({
          id: c.id || `cons-${idx + 1}`,
          title: c.title || c.sessionTitle || `${idx + 1}° SESSÃO`,
          dateStr: c.dateStr || (c.date && c.time ? `${c.date.includes('-') ? c.date.split('-').reverse().join('/') : c.date} às ${c.time}` : (c.date || 'Data: -')),
          duration: c.duration,
          status: c.status || 'Agendada',
          pdfAvailable: Boolean(c.pdfAvailable),
          audioAvailable: Boolean(c.audioAvailable),
          videoAvailable: Boolean(c.videoAvailable || c.meetingUrl),
          audioNotes: c.audioNotes || c.summary
        }))
      : (fallback.consultations || []),
    examsRequested: raw.examsRequested && typeof raw.examsRequested === 'object' && !Array.isArray(raw.examsRequested) 
      ? raw.examsRequested 
      : (fallback.examsRequested || { id: 'req-1', title: 'Painel Integrativo', dateStr: 'Aguardando' }),
    examResults: Array.isArray(raw.examResults) ? raw.examResults : (fallback.examResults || []),
    examBatches: (() => {
      if (Array.isArray(raw.examBatches)) {
        return raw.examBatches.map((b: any, bIdx: number) => ({
          id: b.id || `batch-${bIdx + 1}`,
          title: b.title || `Painel Laboratorial ${bIdx + 1}`,
          dateStr: b.dateStr || b.batchDate || new Date().toLocaleDateString('pt-BR'),
          status: b.status || 'Disponível',
          pdfAvailable: Boolean(b.pdfAvailable || b.laudoPdfUrl),
          results: Array.isArray(b.results)
            ? b.results
            : (Array.isArray(b.exams)
                ? b.exams.map((e: any, eIdx: number) => ({
                    id: e.id || `exam-${eIdx + 1}`,
                    name: e.name || e.analyte || 'Biomarcador',
                    value: String(e.value ?? ''),
                    reference: e.reference || '',
                    status: (e.status?.toLowerCase() === 'normal' || e.status?.toLowerCase() === 'ok') ? 'ok' : 'atenção'
                  }))
                : [])
        }));
      }
      return fallback.examBatches || [];
    })(),
    biomarkerComparisons: Array.isArray(raw.biomarkerComparisons) ? raw.biomarkerComparisons : (fallback.biomarkerComparisons || []),
    physicalAssessments: sortPhysicalAssessmentsDesc(
      Array.isArray(raw.physicalAssessments) ? raw.physicalAssessments : (fallback.physicalAssessments || [])
    ),
    physicalAssessmentComparisons: Array.isArray(raw.physicalAssessmentComparisons) ? raw.physicalAssessmentComparisons : (fallback.physicalAssessmentComparisons || []),
    mealGuides: (() => {
      const rawPlans = Array.isArray(raw.plans) ? raw.plans : (Array.isArray(raw.mealGuides) ? raw.mealGuides : []);
      if (rawPlans.length > 0) {
        return rawPlans.map((p: any, idx: number) => ({
          id: p.id || `plan-${idx + 1}`,
          title: p.title || p.name || `GUIA ${String(idx + 1).padStart(2, '0')}`,
          dateStr: p.dateStr || p.date || (p.createdAt ? new Date(p.createdAt.seconds ? p.createdAt.seconds * 1000 : p.createdAt).toLocaleDateString('pt-BR') : '20/10/2026'),
          isNew: p.isNew ?? true,
          pdfAvailable: Boolean(p.pdfAvailable || p.pdfUrl || p.fileUrl),
          fileUrl: p.pdfUrl || p.fileUrl || ''
        }));
      }
      return fallback.mealGuides || [];
    })(),
    protocols: (() => {
      const rawProts = Array.isArray(raw.protocols) 
        ? raw.protocols 
        : (raw.protocols && typeof raw.protocols === 'object' ? Object.values(raw.protocols) : []);

      if (rawProts.length > 0) {
        return rawProts.map((p: any, pIdx: number) => {
          const rawFormulas = p.formulas || [];
          const defaultActives = safeExtractActives(
            p.actives || 
            (Array.isArray(rawFormulas) ? rawFormulas[0]?.actives : null) ||
            p.items || 
            p.itensPrescritos
          );
          const normalizedFormulas = safeExtractFormulas(
            rawFormulas,
            p.formulaName || p.title || 'Formula Farmácia Manipulação',
            p.posology || p.modoDeUso || '',
            p.observations || '',
            defaultActives
          );
          const effectiveActives = defaultActives.length > 0 
            ? defaultActives 
            : (normalizedFormulas[0]?.actives || []);
          
          return {
            id: p.id || `prot-${pIdx + 1}`,
            title: p.title || p.formulaName || 'Prescrição Médica',
            expirationStr: p.expirationStr || (p.expirationDate ? `Validade: ${p.expirationDate}` : 'Validade: 30 dias'),
            badge: (p.badge || 'novo').toLowerCase() as any,
            audioAvailable: Boolean(p.audioAvailable),
            items: Array.isArray(p.items) ? p.items : (p.items ? [p.items] : []),
            formulaName: p.formulaName || (normalizedFormulas[0]?.name) || 'Formula Farmácia Manipulação',
            emissionDate: p.emissionDate || new Date().toLocaleDateString('pt-BR'),
            expirationDate: p.expirationDate || '',
            posology: p.posology || p.modoDeUso || (normalizedFormulas[0]?.posology) || '',
            observations: p.observations || (normalizedFormulas[0]?.observations) || '',
            actives: effectiveActives,
            formulas: normalizedFormulas
          };
        });
      }
      return fallback.protocols || [];
    })(),
    marketplace: (() => {
      const rawMarketplace = raw.marketplace || raw.acessoAgil || raw.curadoria || raw.linksCuradoria || raw.externalLinks;
      if (Array.isArray(rawMarketplace) && rawMarketplace.length > 0) {
        return rawMarketplace.map((m: any, idx: number) => ({
          id: m.id || `agil-${idx + 1}`,
          name: m.name || m.title || m.produto || 'Suplemento / Fórmula Verificada',
          link: m.link || m.url || m.linkExterno || '#',
          dateStr: m.dateStr || m.date || new Date().toLocaleDateString('pt-BR'),
          icon: m.icon || 'ti-shopping-bag',
          gradient: m.gradient || 'linear-gradient(135deg, #0f7a3a, #1f9d57)',
          description: m.description || m.obs || m.cupom || ''
        }));
      }
      return fallback.marketplace || [];
    })(),
    documents: Array.isArray(raw.documents) ? raw.documents : (fallback.documents || []),
    financial: Array.isArray(raw.financial) ? raw.financial : (fallback.financial || []),
    terms: (() => {
      const rawTerms = raw.terms || raw.agreementTerms || raw.termoAcordo || raw.termos;
      if (Array.isArray(rawTerms) && rawTerms.length > 0) {
        return rawTerms.map((t: any, idx: number) => ({
          id: t.id || `term-${idx + 1}`,
          name: t.name || t.title || t.documentName || 'Termo de Compromisso Clínico',
          dateStr: t.dateStr || t.date || new Date().toLocaleDateString('pt-BR'),
          hasPdf: Boolean(t.hasPdf || t.pdfUrl),
          content: t.content || t.text || ''
        }));
      }
      return fallback.terms || [];
    })(),
    referrals: (() => {
      if (hasLoadedSubReferrals) {
        return cachedSubReferrals;
      }
      if (Array.isArray(raw.referrals) && raw.referrals.length > 0) {
        return raw.referrals.map((r: any, idx: number) => {
          const rawInst = typeof r.instructions === 'string' ? r.instructions.trim() : '';
          return {
            id: r.id || `ref-${idx + 1}`,
            specialty: r.specialty || 'Encaminhamento Médico / Clínico',
            dateStr: r.dateStr || '11/11/2026',
            hasPdf: Boolean(r.hasPdf || r.pdfUrl || rawInst.length > 0),
            doctorName: r.doctorName || 'Dr. João Paulo Cecato',
            instructions: rawInst,
            pdfUrl: r.pdfUrl || ''
          };
        });
      }
      return [];
    })(),

    metabolicAxes: Array.isArray(raw.metabolicAxes)
      ? raw.metabolicAxes
      : (Array.isArray(raw.functionalAxes) ? raw.functionalAxes : []),

    chrononutrition: (() => {
      const rawCrono = raw.chrononutrition || raw.chrononutritionSchedule || raw.cronobiologySchedule;
      if (Array.isArray(rawCrono) && rawCrono.length > 0) {
        if (rawCrono[0]?.periodo || rawCrono[0]?.horario) {
          const colors = ['#2fd575', '#e8930c', '#22d3ee', '#38bdf8', '#a78bfa'];
          return rawCrono.map((item: any, i: number) => {
            let w12: [number, number][] = [[8, 9.5]];
            if (typeof item.horario === 'string' && item.horario.includes('-')) {
              const parts = item.horario.split('-').map((p: string) => p.trim());
              const parseH = (s: string) => {
                const [h, m] = s.split(':').map(Number);
                return (h || 0) + ((m || 0) / 60);
              };
              if (parts.length === 2) {
                const h0 = parseH(parts[0]);
                const h1 = parseH(parts[1]);
                w12 = [[(h0 % 12) || 12, (h1 % 12) || 12]];
              }
            }
            return {
              n: item.periodo || `Período ${i + 1}`,
              c: colors[i % colors.length],
              horarios: [item.horario || ''],
              w12,
              comentario: item.foco || ''
            };
          });
        }
        return rawCrono;
      }
      return [];
    })(),

    lastSyncTimestamp: raw.lastSyncTimestamp || fallback.lastSyncTimestamp || new Date().toISOString(),
    syncedByProgram: raw.syncedByProgram || fallback.syncedByProgram || 'CRM Vittáre',

    startDate: raw.startDate || fallback.startDate,
    endDate: raw.endDate || fallback.endDate,
    termsAccepted: typeof raw.termsAccepted === 'boolean' ? raw.termsAccepted : (fallback.termsAccepted ?? false),
    termsAcceptedAt: raw.termsAcceptedAt || fallback.termsAcceptedAt,
    termsVersion: raw.termsVersion || fallback.termsVersion || '1.0',
  };
}

class CrmDataService {
  private listeners: Map<string, Set<(patient: PatientProfile) => void>> = new Map();
  private activePatientId: string | null = null;
  private lastPassiveSyncTime: number = 0;
  private readonly PASSIVE_SYNC_THROTTLE_MS = 5 * 60 * 1000; // Janela de guarda de 5 minutos

  constructor() {
    this.initLocalStorage();
    this.initPassiveSyncListeners();
  }

  private initLocalStorage() {
    if (typeof window === 'undefined') return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
    }
  }

  /**
   * Estratégia Cache-First com Throttle (Sincronização Passiva por Timestamp com Janela de Guarda)
   */
  private initPassiveSyncListeners() {
    if (typeof window === 'undefined') return;

    const handleCheckUpdate = async () => {
      if (!this.activePatientId || !isFirebaseConfigured() || !db) return;

      const now = Date.now();
      if (now - this.lastPassiveSyncTime < this.PASSIVE_SYNC_THROTTLE_MS) {
        return; // Dentro da janela de guarda de 5 minutos, bloqueia chamadas redundantes e poupa cotas
      }
      this.lastPassiveSyncTime = now;

      try {
        const ref = doc(db, 'patients', this.activePatientId);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          const rawServerData = snapshot.data();
          const serverData = sanitizePatientPayload(rawServerData, this.activePatientId);
          const localData = this.getLocalPatient(this.activePatientId);

          const serverTime = serverData.lastSyncTimestamp ? new Date(serverData.lastSyncTimestamp).getTime() : 0;
          const localTime = localData?.lastSyncTimestamp ? new Date(localData.lastSyncTimestamp).getTime() : 0;

          // Se server_updatedAt > local_updatedAt, atualiza o cache local de borda
          if (serverTime > localTime) {
            console.info("⚡ [Vittáre Sync] Nova versão remota detectada. Atualizando cache local...");
            const all = this.getAllLocalPatients();
            all[this.activePatientId] = serverData;
            this.saveAllLocalPatients(all);
            this.notifyListeners(this.activePatientId, serverData);
          }
        }
      } catch (err) {
        console.warn("⚠️ [Vittáre Sync] Checagem de timestamp ignorada (modo offline ativo):", err);
      }
    };

    window.addEventListener('focus', handleCheckUpdate, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        handleCheckUpdate();
      }
    });
  }

  private getAllLocalPatients(): Record<string, PatientProfile> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const sanitizedRecord: Record<string, PatientProfile> = {};
        for (const [key, val] of Object.entries(parsed)) {
          sanitizedRecord[key] = sanitizePatientPayload(val, key);
        }
        return sanitizedRecord;
      }
    } catch (e) {
      console.error("Erro ao ler do localStorage", e);
    }
    return INITIAL_PATIENTS;
  }

  private getLocalPatient(patientId: string): PatientProfile | null {
    const all = this.getAllLocalPatients();
    if (patientId.startsWith('paciente-') && all['jcecato@gmail.com']) {
      return sanitizePatientPayload(all['jcecato@gmail.com'], 'jcecato@gmail.com');
    }
    const raw = all[patientId] || INITIAL_PATIENTS[patientId] || null;
    return raw ? sanitizePatientPayload(raw, patientId) : null;
  }

  private saveAllLocalPatients(patients: Record<string, PatientProfile>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    } catch (e) {
      console.error("Erro ao salvar no localStorage", e);
    }
  }

  public async getPatientByEmail(email: string): Promise<PatientProfile | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (!isFirebaseConfigured() || !db || !cleanEmail) {
      return null;
    }

    try {
      // 1. Tenta buscar documento direto caso a chave do doc seja o próprio e-mail
      const directRef = doc(db, 'patients', cleanEmail);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        const patientData = sanitizePatientPayload(directSnap.data(), directSnap.id);

        // Busca imediata da subcoleção /exams para disponibilidade instantânea
        try {
          const examsSnap = await getDocs(collection(db, 'patients', cleanEmail, 'exams'));
          if (!examsSnap.empty) {
            patientData.examBatches = examsSnap.docs.map(docSnap => {
              const data = docSnap.data();
              const rawResults = Array.isArray(data.results) ? data.results : (Array.isArray(data.exams) ? data.exams : []);
              const results = rawResults.map((r: any, idx: number) => {
                const st = String(r.status || '').toLowerCase();
                const resolvedStatus: 'ok' | 'atenção' | 'baixo' | 'alto' = 
                  (st === 'alto' || st === 'baixo' || st === 'atenção') ? st : 'ok';
                return {
                  id: r.id || `res-${idx + 1}`,
                  name: r.name || r.analyte || 'Biomarcador',
                  value: String(r.value ?? ''),
                  reference: r.reference || '',
                  status: resolvedStatus
                };
              });

              return {
                id: docSnap.id,
                title: data.title || data.name || data.examTitle || (docSnap.id.startsWith('req-') ? 'Requisição de Exames' : 'Painel Laboratorial'),
                dateStr: data.dateStr || (data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString('pt-BR') : '11/11/2026'),
                status: data.status || 'Solicitado',
                pdfAvailable: Boolean(data.pdfAvailable || data.pdfUrl || data.laudoPdfUrl || true),
                results
              };
            });
          }
        } catch (exErr) {
          console.warn("Erro ao buscar subcoleção exams inicial (regras pendentes):", exErr);
          if (!patientData.examBatches || patientData.examBatches.length === 0) {
            patientData.examBatches = [
              {
                id: 'req-1794410353837',
                title: 'Requisição de Exames Laboratoriais',
                dateStr: '11/11/2026',
                status: 'Solicitado',
                pdfAvailable: true,
                results: []
              }
            ];
          }
        }

        // Busca imediata da subcoleção /referrals para disponibilidade instantânea (100% dinâmica do Firebase)
        try {
          const colRef = collection(db, 'patients', cleanEmail, 'referrals');
          let refsSnap;
          try {
            refsSnap = await getDocsFromServer(colRef);
          } catch {
            refsSnap = await getDocs(colRef);
          }
          const sortedDocs = [...refsSnap.docs].sort((a, b) => b.id.localeCompare(a.id));
          const fetchedRefs = sortedDocs.map(docSnap => {
            const data = docSnap.data();
            const rawInst = typeof data.instructions === 'string' ? data.instructions.trim() : '';
            return {
              id: docSnap.id,
              specialty: data.specialty || 'Encaminhamento Médico / Clínico',
              dateStr: data.dateStr || (data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString('pt-BR') : '11/11/2026'),
              hasPdf: Boolean(data.hasPdf || data.pdfUrl || rawInst.length > 0),
              doctorName: data.doctorName || 'Dr. João Paulo Cecato',
              instructions: rawInst,
              pdfUrl: data.pdfUrl || ''
            };
          });
          hasLoadedSubReferrals = true;
          lastReferralsError = null;
          cachedSubReferrals = fetchedRefs;
          patientData.referrals = fetchedRefs;
        } catch (refErr: any) {
          lastReferralsError = refErr?.code || 'permission-denied';
          console.warn("Erro ao buscar subcoleção referrals inicial:", refErr);
        }

        // Prioridade 1: consultationRecords direto do documento raiz /patients/{email}
        const rootRawData = directSnap.data();
        if (Array.isArray(rootRawData?.consultationRecords)) {
          cachedRootConsultationRecords = normalizeConsultationRecordsList(rootRawData.consultationRecords);
        }

        // Busca imediata da subcoleção /evolution (resumo_geral + registros encounter_*)
        try {
          const evoColRef = collection(db, 'patients', cleanEmail, 'evolution');
          let evoSnap;
          try {
            evoSnap = await getDocsFromServer(evoColRef);
          } catch {
            evoSnap = await getDocs(evoColRef);
          }

          const resumoDoc = evoSnap.docs.find(d => d.id === 'resumo_geral');
          if (resumoDoc) {
            const resumoData = resumoDoc.data();
            const normSum = normalizeClinicalSummary({ ...resumoData, id: resumoDoc.id });
            if (normSum) {
              cachedClinicalSummaryInfo = normSum;
              patientData.clinicalSummaryInfo = normSum;
              patientData.clinicalSummary = normSum.summary;
            }
            cachedResumoConsultationRecords = extractConsultationRecordsFromResumoGeral(resumoData);
            const normWb = normalizeWellbeingData(resumoData, rootRawData);
            if (normWb) {
              cachedWellbeingData = normWb;
              patientData.wellbeingData = cachedWellbeingData;
            }
          } else {
            cachedResumoConsultationRecords = [];
            const rootWb = normalizeWellbeingData(null, rootRawData);
            if (rootWb) {
              cachedWellbeingData = rootWb;
              patientData.wellbeingData = cachedWellbeingData;
            }
          }

          const encounterDocs = evoSnap.docs.filter(d => isConsultationEncounterDoc(d.id, d.data()));
          const fetchedEncounters = sortClinicalEvolutionsDesc(
            encounterDocs.map(docSnap => normalizeClinicalEvolution({ ...docSnap.data(), id: docSnap.id }, docSnap.id))
          );
          hasLoadedSubEvolution = true;
          lastEvolutionsError = null;
          cachedSubEvolutions = fetchedEncounters;
        } catch (evoErr: any) {
          lastEvolutionsError = evoErr?.code || 'permission-denied';
          console.warn("Erro ao buscar subcoleção evolution inicial:", evoErr);
        }

        const authoritativeRecords = resolveAuthoritativeConsultationRecords(
          cachedRootConsultationRecords,
          cachedResumoConsultationRecords,
          cachedSubEvolutions
        );
        patientData.clinicalEvolutions = authoritativeRecords;

        const all = this.getAllLocalPatients();
        all[patientData.id] = patientData;
        all['paciente-template-01'] = patientData;
        all[cleanEmail] = patientData;
        this.saveAllLocalPatients(all);
        this.notifyListeners(patientData.id, patientData);
        return patientData;
      }

      // 1.1 Tenta buscar documento pelo UID gravado pelo CRM: CD79xOvBqsc8wYQu1bKZRPbNIz02
      const uidRef = doc(db, 'patients', 'CD79xOvBqsc8wYQu1bKZRPbNIz02');
      const uidSnap = await getDoc(uidRef);
      if (uidSnap.exists()) {
        const patientData = sanitizePatientPayload(uidSnap.data(), uidSnap.id);
        const all = this.getAllLocalPatients();
        all[patientData.id] = patientData;
        all['paciente-template-01'] = patientData;
        this.saveAllLocalPatients(all);
        this.notifyListeners(patientData.id, patientData);
        return patientData;
      }

      // 2. Query Firestore buscando pelo campo 'email'
      const q = query(
        collection(db, 'patients'),
        where('email', '==', cleanEmail),
        limit(1)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const rawData = docSnap.data();
        const patientData = sanitizePatientPayload(rawData, docSnap.id);
        const all = this.getAllLocalPatients();
        all[patientData.id] = patientData;
        all['paciente-template-01'] = patientData;
        this.saveAllLocalPatients(all);
        this.notifyListeners(patientData.id, patientData);
        return patientData;
      }
    } catch (err) {
      console.warn("⚠️ [Vittáre Data] Erro ao buscar paciente por e-mail no Firestore:", err);
    }

    return null;
  }

  public async getPatient(patientId: string): Promise<PatientProfile | null> {
    this.activePatientId = patientId;

    if (patientId.includes('@')) {
      const byEmail = await this.getPatientByEmail(patientId);
      if (byEmail) return byEmail;
    }

    const targetId = (auth?.currentUser && patientId.startsWith('paciente-')) 
      ? auth.currentUser.uid 
      : patientId;
    this.activePatientId = targetId;

    if (isFirebaseConfigured() && db) {
      try {
        // 1. Busca Primária: Documento nomeado pelo targetId se não for template padrão
        let snapshot: DocumentSnapshot | null = null;
        if (!targetId.startsWith('paciente-')) {
          const ref = doc(db, 'patients', targetId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            snapshot = snap;
          }
        }

        // 2. Busca Secundária: Caso não encontre ou seja template, busca pelo e-mail
        const emailToCheck = auth?.currentUser?.email?.toLowerCase().trim() ||
          (typeof window !== 'undefined' ? localStorage.getItem('vittare_remembered_email')?.toLowerCase().trim() : null) ||
          'jcecato@gmail.com';

        if (!snapshot || !snapshot.exists()) {
          const byEmail = await this.getPatientByEmail(emailToCheck);
          if (byEmail) return byEmail;
        }

        if (snapshot && snapshot.exists()) {
          const rawRemote = snapshot.data();
          const remoteData = sanitizePatientPayload(rawRemote, targetId);
          const all = this.getAllLocalPatients();
          all[patientId] = remoteData;
          all[targetId] = remoteData;
          this.saveAllLocalPatients(all);
          return remoteData;
        }
      } catch (err) {
        console.warn("Firebase query falhou, utilizando cache local:", err);
      }
    }

    return this.getLocalPatient(patientId);
  }

  public async updatePatient(
    patientId: string,
    updates: Partial<PatientProfile>,
    source: string = 'CRM Vittáre Admin',
    syncToRemote: boolean = false
  ): Promise<PatientProfile> {
    const all = this.getAllLocalPatients();
    const fallbackTemplate = INITIAL_PATIENTS['paciente-template-01'] || Object.values(INITIAL_PATIENTS)[0];
    const current = all[patientId] || INITIAL_PATIENTS[patientId] || fallbackTemplate;

    const updatedRaw: PatientProfile = {
      ...current,
      id: patientId,
      ...updates,
      lastSyncTimestamp: new Date().toISOString(),
      syncedByProgram: source
    };

    const updated = sanitizePatientPayload(updatedRaw, patientId);

    all[patientId] = updated;
    this.saveAllLocalPatients(all);

    // Gravação remota no Firestore só deve ocorrer se explicitamente solicitada
    // O documento raiz do paciente é gerenciado com exclusividade pelo CRM via Service Account
    if (syncToRemote && isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, 'patients', patientId);
        await setDoc(ref, updated, { merge: true });
      } catch (err) {
        console.warn("Falha ao sincronizar com Firestore:", err);
      }
    }

    this.notifyListeners(patientId, updated);
    return updated;
  }

  public subscribeToPatient(
    patientId: string,
    callback: (patient: PatientProfile) => void
  ): () => void {
    if (!this.listeners.has(patientId)) {
      this.listeners.set(patientId, new Set());
    }
    this.listeners.get(patientId)!.add(callback);

    this.getPatient(patientId).then(p => {
      if (p) callback(p);
    });

    let unsubscribeFirestore: (() => void) | null = null;
    let unsubscribePlansFirestore: (() => void) | null = null;
    let unsubscribePrescriptionsFirestore: (() => void) | null = null;
    let unsubscribeExamsFirestore: (() => void) | null = null;
    let unsubscribeAnthroFirestore: (() => void) | null = null;
    let unsubscribeMapFirestore: (() => void) | null = null;
    let unsubscribeAnamnesisFirestore: (() => void) | null = null;
    let unsubscribeEvolutionsFirestore: (() => void) | null = null;
    let unsubscribeEvolutionSummaryFirestore: (() => void) | null = null;
    let unsubscribeReferralsFirestore: (() => void) | null = null;
    let unsubscribeEmailFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      const firestoreDb = db;
      try {
        const resolvedEmail = (patientId && patientId.includes('@'))
          ? patientId.toLowerCase().trim()
          : (auth?.currentUser?.email?.toLowerCase().trim() ||
             (typeof window !== 'undefined' ? localStorage.getItem('vittare_remembered_email')?.toLowerCase().trim() : null) ||
             'jcecato@gmail.com');

        // O documento canônico de dados clínicos e subcoleções no Firestore é indexado pelo e-mail oficial
        const targetDocId = resolvedEmail;

        if (targetDocId) {
          const ref = doc(firestoreDb, 'patients', targetDocId);
          unsubscribeFirestore = onSnapshot(
            ref,
            (snapshot: DocumentSnapshot) => {
              if (snapshot.exists()) {
                const raw = snapshot.data();
                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const remotePatient = sanitizePatientPayload(raw, targetDocId);
                
                // Preserva prescrições com ativos reais vindos da subcoleção oficial
                const mergedProtocols = resolveAuthoritativeProtocols(remotePatient.protocols, currentP.protocols);

                if (Array.isArray(raw?.consultationRecords)) {
                  cachedRootConsultationRecords = normalizeConsultationRecordsList(raw.consultationRecords);
                }

                const resolvedSummaryInfo = cachedClinicalSummaryInfo || remotePatient.clinicalSummaryInfo || currentP.clinicalSummaryInfo;
                const resolvedSummaryText = resolvedSummaryInfo?.summary || remotePatient.clinicalSummary || currentP.clinicalSummary;
                const resolvedWellbeing = mergeWellbeingData(
                  remotePatient.wellbeingData,
                  mergeWellbeingData(cachedWellbeingData, currentP.wellbeingData)
                );
                if (resolvedWellbeing) {
                  cachedWellbeingData = resolvedWellbeing;
                }

                const resolvedConsultationRecords = resolveAuthoritativeConsultationRecords(
                  Array.isArray(raw?.consultationRecords) ? cachedRootConsultationRecords : undefined,
                  cachedResumoConsultationRecords,
                  cachedSubEvolutions
                );

                const mergedPatient: PatientProfile = {
                  ...remotePatient,
                  protocols: mergedProtocols,
                  mealGuides: (remotePatient.mealGuides && remotePatient.mealGuides.length > 0)
                    ? remotePatient.mealGuides
                    : (currentP.mealGuides || []),
                  examBatches: cachedSubExamBatches.length > 0
                    ? cachedSubExamBatches
                    : ((currentP.examBatches && currentP.examBatches.length > 0) ? currentP.examBatches : remotePatient.examBatches),
                  referrals: hasLoadedSubReferrals
                    ? cachedSubReferrals
                    : (remotePatient.referrals || []),
                  clinicalEvolutions: resolvedConsultationRecords.length > 0
                    ? resolvedConsultationRecords
                    : (remotePatient.clinicalEvolutions || []),
                  ...(resolvedSummaryText ? { clinicalSummary: resolvedSummaryText } : {}),
                  ...(resolvedSummaryInfo ? { clinicalSummaryInfo: resolvedSummaryInfo } : {}),
                  ...(resolvedWellbeing ? { wellbeingData: resolvedWellbeing } : {})
                };
                callback(mergedPatient);
              }
            },
            (err) => {
              console.info("🔒 [Vittáre Data] Listener Firestore em modo seguro:", err.code);
            }
          );

          // Escuta em tempo real na subcoleção /plans (Planos Alimentares gravados pelo CRM)
          try {
            const plansRef = collection(firestoreDb, 'patients', targetDocId, 'plans');
            unsubscribePlansFirestore = onSnapshot(plansRef, (plansSnap) => {
              if (!plansSnap.empty) {
                const subPlans = plansSnap.docs.map(pDoc => {
                  const data = pDoc.data();
                  return {
                    id: pDoc.id,
                    title: data.title || data.name || 'Plano Alimentar',
                    dateStr: data.dateStr || (data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString('pt-BR') : '20/10/2026'),
                    isNew: data.isNew ?? true,
                    pdfAvailable: Boolean(data.pdfUrl || data.fileUrl || data.pdfAvailable !== false),
                    fileUrl: data.pdfUrl || data.fileUrl || ''
                  };
                });

                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const updatedPatient: PatientProfile = {
                  ...currentP,
                  mealGuides: [...subPlans, ...(currentP.mealGuides || [])].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
                };
                callback(updatedPatient);
              }
            }, (err) => {
              console.info("🔒 [Vittáre Data] Subcoleção plans em modo seguro:", err.code);
            });
          } catch (pErr) {
            console.warn("Erro no listener da subcoleção plans:", pErr);
          }

          // Escuta em tempo real na subcoleção /prescriptions (Fórmulas e Prescrições gravadas pelo CRM)
          try {
            const prescRef = collection(firestoreDb, 'patients', targetDocId, 'prescriptions');
            unsubscribePrescriptionsFirestore = onSnapshot(prescRef, (prescSnap) => {
              if (!prescSnap.empty) {
                const subPrescriptions: ProtocolItem[] = prescSnap.docs.map(pDoc => {
                  const data = pDoc.data();
                  const badgeNorm = (data.badge || 'novo').toLowerCase();
                  
                  // Extração inteligente e polimórfica de fórmulas e ativos reais gravados pelo CRM
                  const defaultActives = safeExtractActives(
                    data.actives || 
                    (Array.isArray(data.formulas) ? data.formulas[0]?.actives : (data.formulas?.[0]?.actives || data.formulas?.['0']?.actives))
                  );

                  const normalizedFormulas = safeExtractFormulas(
                    data.formulas,
                    data.formulaName || data.title || 'Formula Farmácia Manipulação',
                    data.posology || data.modoDeUso || 'Tomar conforme orientação clínica.',
                    data.observations || data.obsClinica || '',
                    defaultActives
                  );

                  const effectiveActives = defaultActives.length > 0 
                    ? defaultActives 
                    : (normalizedFormulas[0]?.actives || []);

                  return {
                    id: pDoc.id,
                    title: data.title || data.formulaName || 'Prescrição Médica',
                    expirationStr: data.expirationStr || (data.expirationDate ? `Validade: ${data.expirationDate}` : 'Validade: 30 dias'),
                    badge: (badgeNorm === 'novo' || badgeNorm === 'atualizado' || badgeNorm === 'descontinuado' ? badgeNorm : 'novo') as 'novo' | 'atualizado' | 'descontinuado',
                    audioAvailable: Boolean(data.audioAvailable),
                    formulaName: data.formulaName || (normalizedFormulas[0]?.name) || 'Formula Farmácia Manipulação',
                    emissionDate: data.emissionDate || new Date().toLocaleDateString('pt-BR'),
                    expirationDate: data.expirationDate || '',
                    posology: data.posology || data.modoDeUso || (normalizedFormulas[0]?.posology) || '',
                    observations: data.observations || (normalizedFormulas[0]?.observations) || '',
                    actives: effectiveActives,
                    formulas: normalizedFormulas
                  };
                });

                // Atualiza o cache seguro de prescrições oficiais
                cachedSubPrescriptions = subPrescriptions;

                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                
                // Desativa o reconhecimento da aba para disparar a notificação visual no aplicativo
                const currentAck = currentP.lyaNotification?.acknowledgedTabs || [];
                const updatedAck = currentAck.filter(t => t !== 'protocolo' && t !== 'formulas-suprimentos');
                const updatedNotification = currentP.lyaNotification ? {
                  ...currentP.lyaNotification,
                  acknowledgedTabs: updatedAck
                } : currentP.lyaNotification;

                const updatedPatient: PatientProfile = {
                  ...currentP,
                  protocols: subPrescriptions,
                  ...(updatedNotification ? { lyaNotification: updatedNotification } : {})
                };
                callback(updatedPatient);
              } else if (cachedSubPrescriptions.length === 0) {
                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const updatedPatient: PatientProfile = {
                  ...currentP,
                  protocols: []
                };
                callback(updatedPatient);
              }
            }, (err) => {
              console.info("🔒 [Vittáre Data] Subcoleção prescriptions em modo seguro:", err.code);
            });
          } catch (prErr) {
            console.warn("Erro no listener da subcoleção prescriptions:", prErr);
          }

          // Escuta em tempo real na subcoleção /exams (Hemo Labor™ - Exames Laboratoriais)
          try {
            const examsRef = collection(firestoreDb, 'patients', targetDocId, 'exams');
            unsubscribeExamsFirestore = onSnapshot(examsRef, (snap) => {
              if (!snap.empty) {
                const subBatches: ExamBatch[] = snap.docs.map(docSnap => {
                  const data = docSnap.data();
                  const rawResults = Array.isArray(data.results) ? data.results : (Array.isArray(data.exams) ? data.exams : []);
                  const results = rawResults.map((r: any, idx: number) => {
                    const st = String(r.status || '').toLowerCase();
                    const resolvedStatus: 'ok' | 'atenção' | 'baixo' | 'alto' = 
                      (st === 'alto' || st === 'baixo' || st === 'atenção') ? st : 'ok';
                    return {
                      id: r.id || `res-${idx + 1}`,
                      name: r.name || r.analyte || 'Biomarcador',
                      value: String(r.value ?? ''),
                      reference: r.reference || '',
                      status: resolvedStatus
                    };
                  });

                  return {
                    id: docSnap.id,
                    title: data.title || data.name || data.examTitle || (docSnap.id.startsWith('req-') ? 'Requisição de Exames' : 'Painel Laboratorial'),
                    dateStr: data.dateStr || (data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString('pt-BR') : '11/11/2026'),
                    status: data.status || 'Solicitado',
                    pdfAvailable: Boolean(data.pdfAvailable || data.pdfUrl || data.laudoPdfUrl || true),
                    results
                  };
                });

                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const updatedPatient: PatientProfile = {
                  ...currentP,
                  examBatches: subBatches
                };
                const all = this.getAllLocalPatients();
                all[patientId] = updatedPatient;
                all['paciente-template-01'] = updatedPatient;
                all[targetDocId] = updatedPatient;
                this.saveAllLocalPatients(all);
                callback(updatedPatient);
              }
            }, (err) => {
              console.info("🔒 [Vittáre Data] Subcoleção exams em modo seguro (regras pendentes no console):", err.code);
              const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
              if (!currentP.examBatches || currentP.examBatches.length === 0) {
                const updatedPatient: PatientProfile = {
                  ...currentP,
                  examBatches: [
                    {
                      id: 'req-1794410353837',
                      title: 'Requisição de Exames Laboratoriais',
                      dateStr: '11/11/2026',
                      status: 'Solicitado',
                      pdfAvailable: true,
                      results: []
                    }
                  ]
                };
                const all = this.getAllLocalPatients();
                all[patientId] = updatedPatient;
                all['paciente-template-01'] = updatedPatient;
                all[targetDocId] = updatedPatient;
                this.saveAllLocalPatients(all);
                callback(updatedPatient);
              }
            });
          } catch (eErr) {
            console.warn("Erro no listener da subcoleção exams:", eErr);
          }

          // Escuta em tempo real na subcoleção /anthropometry (OnBody™ - Avaliação Corporal)
          try {
            const anthroRef = collection(firestoreDb, 'patients', targetDocId, 'anthropometry');
            unsubscribeAnthroFirestore = onSnapshot(anthroRef, (snap) => {
              if (!snap.empty) {
                const rawAssessments: PhysicalAssessmentItem[] = snap.docs.map(docSnap => {
                  const data = docSnap.data();
                  const createdMs = parseAssessmentTimestampMs(data.createdAt);
                  const updatedMs = parseAssessmentTimestampMs(data.updatedAt);
                  const rawDate = data.dateStr || (createdMs > 0 ? new Date(createdMs).toLocaleDateString('pt-BR') : '11/11/2026');
                  const formattedDate = rawDate.startsWith('Data:') ? rawDate : `Data: ${rawDate}`;
                  return {
                    id: docSnap.id,
                    title: data.title || 'Avaliação Corporal',
                    dateStr: formattedDate,
                    status: (data.status?.toLowerCase() === 'laudo' || data.status?.toLowerCase() === 'disponível') ? 'laudo' : 'aguardando',
                    pdfAvailable: Boolean(data.pdfAvailable || data.pdfUrl),
                    pdfUrl: data.pdfUrl || '',
                    metrics: data.metrics || {},
                    updatedAt: updatedMs > 0 ? String(updatedMs) : (data.updatedAt || ''),
                    createdAt: createdMs > 0 ? createdMs : ''
                  };
                });

                const subAssessments = sortPhysicalAssessmentsDesc(rawAssessments);

                cachedSubAssessments = subAssessments;
                lastAnthroError = null;

                const latestDoc = subAssessments[0]?.metrics || {};
                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const updatedProgress = latestDoc ? {
                  ...currentP.progress,
                  currentWeight: (latestDoc.weight !== undefined && latestDoc.weight !== '') ? Number(latestDoc.weight) : currentP.progress.currentWeight,
                  bodyFat: (latestDoc.bodyFat !== undefined && latestDoc.bodyFat !== '') ? Number(latestDoc.bodyFat) : currentP.progress.bodyFat,
                  muscleMass: (latestDoc.muscleMass !== undefined && latestDoc.muscleMass !== '') ? Number(latestDoc.muscleMass) : currentP.progress.muscleMass,
                  visceralFat: (latestDoc.visceralFat !== undefined && latestDoc.visceralFat !== '') ? Number(latestDoc.visceralFat) : currentP.progress.visceralFat,
                  waistCircumference: (latestDoc.waistCircumference !== undefined && latestDoc.waistCircumference !== '') ? Number(latestDoc.waistCircumference) : currentP.progress.waistCircumference,
                } : currentP.progress;

                const derivedComparisons = this.computeAssessmentComparisons(subAssessments);

                const updatedPatient: PatientProfile = {
                  ...currentP,
                  physicalAssessments: subAssessments,
                  progress: updatedProgress,
                  ...(derivedComparisons.length > 0 ? { physicalAssessmentComparisons: derivedComparisons } : {})
                };
                const all = this.getAllLocalPatients();
                all[patientId] = updatedPatient;
                all['paciente-template-01'] = updatedPatient;
                all[targetDocId] = updatedPatient;
                this.saveAllLocalPatients(all);
                callback(updatedPatient);
              }
            }, (err) => {
              lastAnthroError = err?.code || 'permission-denied';
              console.info("🔒 [Vittáre Data] Subcoleção anthropometry em modo seguro:", err.code);
            });
          } catch (aErr) {
            console.warn("Erro no listener da subcoleção anthropometry:", aErr);
          }

          // Escuta em tempo real na subcoleção /metabolic_map (BioSync™ - Mapa Funcional)
          try {
            const mapRef = collection(firestoreDb, 'patients', targetDocId, 'metabolic_map');
            unsubscribeMapFirestore = onSnapshot(mapRef, (snap) => {
              if (!snap.empty) {
                const latestDoc = snap.docs[0]?.data();
                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const updatedAxes = Array.isArray(latestDoc?.axes) ? latestDoc.axes : currentP.metabolicAxes;
                const updatedCrono = Array.isArray(latestDoc?.chrononutrition) ? latestDoc.chrononutrition : currentP.chrononutrition;

                const updatedPatient: PatientProfile = {
                  ...currentP,
                  metabolicAxes: updatedAxes,
                  chrononutrition: updatedCrono
                };
                const all = this.getAllLocalPatients();
                all[patientId] = updatedPatient;
                this.saveAllLocalPatients(all);
                callback(updatedPatient);
              }
            }, (err) => {
              console.info("🔒 [Vittáre Data] Subcoleção metabolic_map em modo seguro:", err.code);
            });
          } catch (mErr) {
            console.warn("Erro no listener da subcoleção metabolic_map:", mErr);
          }

          // Escuta em tempo real na subcoleção /evolution (resumo_geral + registros encounter_*)
          try {
            const evolutionColRef = collection(firestoreDb, 'patients', targetDocId, 'evolution');
            unsubscribeEvolutionsFirestore = onSnapshot(evolutionColRef, (snap) => {
              const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];

              const resumoDoc = snap.docs.find(d => d.id === 'resumo_geral');
              if (resumoDoc) {
                const resumoData = resumoDoc.data();
                const normSummary = normalizeClinicalSummary({ ...resumoData, id: resumoDoc.id });
                if (normSummary) {
                  cachedClinicalSummaryInfo = normSummary;
                }
                if (Array.isArray(resumoData?.consultationRecords)) {
                  cachedResumoConsultationRecords = normalizeConsultationRecordsList(resumoData.consultationRecords);
                }
                const normWb = normalizeWellbeingData(resumoData, currentP.wellbeingData);
                if (normWb) {
                  cachedWellbeingData = mergeWellbeingData(normWb, cachedWellbeingData) || normWb;
                }
              }

              const encounterDocs = snap.docs.filter(d => isConsultationEncounterDoc(d.id, d.data()));
              const subEvs = sortClinicalEvolutionsDesc(
                encounterDocs.map(docSnap => normalizeClinicalEvolution({ ...docSnap.data(), id: docSnap.id }, docSnap.id))
              );
              hasLoadedSubEvolution = true;
              cachedSubEvolutions = subEvs;
              lastEvolutionsError = null;

              const resolvedWellbeing = mergeWellbeingData(cachedWellbeingData, currentP.wellbeingData);
              const resolvedConsultationRecords = resolveAuthoritativeConsultationRecords(
                cachedRootConsultationRecords,
                cachedResumoConsultationRecords,
                subEvs
              );
              const effectiveEvs =
                resolvedConsultationRecords.length > 0
                  ? resolvedConsultationRecords
                  : (currentP.clinicalEvolutions || []);

              const updatedPatient: PatientProfile = {
                ...currentP,
                clinicalEvolutions: effectiveEvs,
                ...(cachedClinicalSummaryInfo ? {
                  clinicalSummary: cachedClinicalSummaryInfo.summary,
                  clinicalSummaryInfo: cachedClinicalSummaryInfo
                } : {}),
                ...(resolvedWellbeing ? { wellbeingData: resolvedWellbeing } : {})
              };
              const all = this.getAllLocalPatients();
              all[patientId] = updatedPatient;
              all['paciente-template-01'] = updatedPatient;
              all[targetDocId] = updatedPatient;
              this.saveAllLocalPatients(all);
              callback(updatedPatient);
            }, (err) => {
              lastEvolutionsError = err?.code || 'permission-denied';
              console.info("🔒 [Vittáre Data] Subcoleção evolution em modo seguro:", err.code);
            });
          } catch (evErr) {
            console.warn("Erro no listener da subcoleção evolution:", evErr);
          }

          try {
            const evolutionSummaryRef = doc(firestoreDb, 'patients', targetDocId, 'evolution', 'resumo_geral');
            unsubscribeEvolutionSummaryFirestore = onSnapshot(evolutionSummaryRef, (docSnap) => {
              if (docSnap.exists()) {
                const resumoData = docSnap.data();
                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const normSummary = normalizeClinicalSummary({ ...resumoData, id: docSnap.id });
                if (normSummary) {
                  cachedClinicalSummaryInfo = normSummary;
                }
                if (Array.isArray(resumoData?.consultationRecords)) {
                  cachedResumoConsultationRecords = normalizeConsultationRecordsList(resumoData.consultationRecords);
                }
                const normWb = normalizeWellbeingData(resumoData, currentP.wellbeingData);
                if (normWb) {
                  cachedWellbeingData = mergeWellbeingData(normWb, cachedWellbeingData) || normWb;
                }
                lastEvolutionsError = null;

                const resolvedWellbeing = mergeWellbeingData(cachedWellbeingData, currentP.wellbeingData);
                const resolvedConsultationRecords = resolveAuthoritativeConsultationRecords(
                  cachedRootConsultationRecords,
                  cachedResumoConsultationRecords,
                  cachedSubEvolutions
                );

                const updatedPatient: PatientProfile = {
                  ...currentP,
                  ...(resolvedConsultationRecords.length > 0 ? { clinicalEvolutions: resolvedConsultationRecords } : {}),
                  ...(normSummary ? {
                    clinicalSummary: normSummary.summary,
                    clinicalSummaryInfo: normSummary
                  } : {}),
                  ...(resolvedWellbeing ? { wellbeingData: resolvedWellbeing } : {})
                };
                const all = this.getAllLocalPatients();
                all[patientId] = updatedPatient;
                all['paciente-template-01'] = updatedPatient;
                all[targetDocId] = updatedPatient;
                this.saveAllLocalPatients(all);
                callback(updatedPatient);
              }
            }, (err) => {
              console.info("🔒 [Vittáre Data] Documento evolution/resumo_geral em modo seguro:", err.code);
            });
          } catch (sumErr) {
            console.warn("Erro no listener de evolution/resumo_geral:", sumErr);
          }

          try {
            const anamnesisRef = collection(firestoreDb, 'patients', targetDocId, 'anamnesis');
            unsubscribeAnamnesisFirestore = onSnapshot(anamnesisRef, (snap) => {
              if (!snap.empty) {
                const latestDoc = snap.docs[0]?.data();
                const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                const notes = latestDoc?.crmGeneralNotes || latestDoc?.clinicalNotes || latestDoc?.notes || currentP.crmGeneralNotes;

                const updatedPatient: PatientProfile = {
                  ...currentP,
                  crmGeneralNotes: notes
                };
                const all = this.getAllLocalPatients();
                all[patientId] = updatedPatient;
                this.saveAllLocalPatients(all);
                callback(updatedPatient);
              }
            }, (err) => {
              console.info("🔒 [Vittáre Data] Subcoleção anamnesis em modo seguro:", err.code);
            });
          } catch (anErr) {
            console.warn("Erro no listener da subcoleção anamnesis:", anErr);
          }

          // Escuta em tempo real na subcoleção /referrals (Encaminhamento Multidisciplinar - Create, Update e Delete)
          try {
            const referralsRef = collection(firestoreDb, 'patients', targetDocId, 'referrals');
            unsubscribeReferralsFirestore = onSnapshot(referralsRef, (snap) => {
              const sortedDocs = [...snap.docs].sort((a, b) => b.id.localeCompare(a.id));
              const subRefs: ReferralItem[] = sortedDocs.map(docSnap => {
                const data = docSnap.data();
                const rawInst = typeof data.instructions === 'string' ? data.instructions.trim() : '';
                return {
                  id: docSnap.id,
                  specialty: data.specialty || 'Encaminhamento Médico / Clínico',
                  dateStr: data.dateStr || (data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString('pt-BR') : '11/11/2026'),
                  hasPdf: Boolean(data.hasPdf || data.pdfUrl || rawInst.length > 0),
                  doctorName: data.doctorName || 'Dr. João Paulo Cecato',
                  instructions: rawInst,
                  pdfUrl: data.pdfUrl || ''
                };
              });

              hasLoadedSubReferrals = true;
              lastReferralsError = null;
              cachedSubReferrals = subRefs;

              const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
              const updatedPatient: PatientProfile = {
                ...currentP,
                referrals: subRefs
              };
              const all = this.getAllLocalPatients();
              all[patientId] = updatedPatient;
              all['paciente-template-01'] = updatedPatient;
              all[targetDocId] = updatedPatient;
              this.saveAllLocalPatients(all);
              callback(updatedPatient);
            }, (err) => {
              lastReferralsError = err?.code || 'permission-denied';
              console.info("🔒 [Vittáre Data] Subcoleção referrals em modo seguro:", err.code);
            });
          } catch (rErr) {
            console.warn("Erro no listener da subcoleção referrals:", rErr);
          }
        }

        const emailToCheck = auth?.currentUser?.email?.toLowerCase().trim() ||
          (typeof window !== 'undefined' ? localStorage.getItem('vittare_remembered_email')?.toLowerCase().trim() : null) ||
          'jcecato@gmail.com';

        if (emailToCheck) {
          try {
            const q = query(
              collection(firestoreDb, 'patients'),
              where('email', '==', emailToCheck),
              limit(1)
            );
            unsubscribeEmailFirestore = onSnapshot(
              q,
              (querySnap) => {
                if (!querySnap.empty) {
                  const docSnap = querySnap.docs[0];
                  const currentP = this.getAllLocalPatients()[patientId] || INITIAL_PATIENTS['paciente-template-01'];
                  const rawDocData = docSnap.data();
                  if (Array.isArray(rawDocData?.consultationRecords)) {
                    cachedRootConsultationRecords = normalizeConsultationRecordsList(rawDocData.consultationRecords);
                  }
                  const remoteData = sanitizePatientPayload(rawDocData, docSnap.id);
                  const mergedProtocols = resolveAuthoritativeProtocols(remoteData.protocols, currentP.protocols);

                  const resolvedWellbeing = mergeWellbeingData(
                    remoteData.wellbeingData,
                    mergeWellbeingData(cachedWellbeingData, currentP.wellbeingData)
                  );
                  const resolvedConsultationRecords = resolveAuthoritativeConsultationRecords(
                    Array.isArray(rawDocData?.consultationRecords) ? cachedRootConsultationRecords : undefined,
                    cachedResumoConsultationRecords,
                    cachedSubEvolutions
                  );

                  const mergedData: PatientProfile = {
                    ...remoteData,
                    protocols: mergedProtocols,
                    mealGuides: (remoteData.mealGuides && remoteData.mealGuides.length > 0)
                      ? remoteData.mealGuides
                      : (currentP.mealGuides || []),
                    examBatches: cachedSubExamBatches.length > 0
                      ? cachedSubExamBatches
                      : ((currentP.examBatches && currentP.examBatches.length > 0) ? currentP.examBatches : remoteData.examBatches),
                    referrals: hasLoadedSubReferrals
                      ? cachedSubReferrals
                      : (remoteData.referrals || []),
                    clinicalEvolutions: resolvedConsultationRecords.length > 0
                      ? resolvedConsultationRecords
                      : (remoteData.clinicalEvolutions || []),
                    ...((cachedClinicalSummaryInfo || remoteData.clinicalSummaryInfo || currentP.clinicalSummaryInfo) ? {
                      clinicalSummaryInfo: cachedClinicalSummaryInfo || remoteData.clinicalSummaryInfo || currentP.clinicalSummaryInfo,
                      clinicalSummary: (cachedClinicalSummaryInfo || remoteData.clinicalSummaryInfo || currentP.clinicalSummaryInfo)?.summary || remoteData.clinicalSummary
                    } : {}),
                    ...(resolvedWellbeing ? { wellbeingData: resolvedWellbeing } : {})
                  };
                  callback(mergedData);
                }
              },
              (err) => {
                console.info("🔒 [Vittáre Data] Listener Firestore por query em modo seguro:", err.code);
              }
            );
          } catch (qErr) {
            console.warn("Falha ao registrar query listener do Firestore:", qErr);
          }
        }
      } catch (err) {
        console.warn("Falha ao registrar listener do Firestore:", err);
      }
    }

    return () => {
      this.listeners.get(patientId)?.delete(callback);
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
      if (unsubscribePlansFirestore) {
        unsubscribePlansFirestore();
      }
      if (unsubscribePrescriptionsFirestore) {
        unsubscribePrescriptionsFirestore();
      }
      if (unsubscribeExamsFirestore) {
        unsubscribeExamsFirestore();
      }
      if (unsubscribeAnthroFirestore) {
        unsubscribeAnthroFirestore();
      }
      if (unsubscribeMapFirestore) {
        unsubscribeMapFirestore();
      }
      if (unsubscribeAnamnesisFirestore) {
        unsubscribeAnamnesisFirestore();
      }
      if (unsubscribeEvolutionsFirestore) {
        unsubscribeEvolutionsFirestore();
      }
      if (unsubscribeEvolutionSummaryFirestore) {
        unsubscribeEvolutionSummaryFirestore();
      }
      if (unsubscribeReferralsFirestore) {
        unsubscribeReferralsFirestore();
      }
      if (unsubscribeEmailFirestore) {
        unsubscribeEmailFirestore();
      }
    };
  }

  private notifyListeners(patientId: string, patient: PatientProfile) {
    const set = this.listeners.get(patientId);
    if (set) {
      set.forEach(cb => {
        try {
          cb(patient);
        } catch (e) {
          console.error("Erro no listener do paciente:", e);
        }
      });
    }
  }

  public getReferralsSyncError(): string | null {
    return lastReferralsError;
  }

  public async refreshReferrals(patientEmailOrId: string = 'jcecato@gmail.com'): Promise<ReferralItem[]> {
    if (!isFirebaseConfigured() || !db) {
      return cachedSubReferrals;
    }

    const targetDocId = (patientEmailOrId && patientEmailOrId.includes('@'))
      ? patientEmailOrId.toLowerCase().trim()
      : (auth?.currentUser?.email?.toLowerCase().trim() ||
         (typeof window !== 'undefined' ? localStorage.getItem('vittare_remembered_email')?.toLowerCase().trim() : null) ||
         'jcecato@gmail.com');

    try {
      const colRef = collection(db, 'patients', targetDocId, 'referrals');
      let snap;
      try {
        snap = await getDocsFromServer(colRef);
      } catch {
        snap = await getDocs(colRef);
      }

      const sortedDocs = [...snap.docs].sort((a, b) => b.id.localeCompare(a.id));
      const freshRefs: ReferralItem[] = sortedDocs.map(docSnap => {
        const data = docSnap.data();
        const rawInst = typeof data.instructions === 'string' ? data.instructions.trim() : '';
        return {
          id: docSnap.id,
          specialty: data.specialty || 'Encaminhamento Médico / Clínico',
          dateStr: data.dateStr || (data.createdAt ? new Date(data.createdAt.seconds ? data.createdAt.seconds * 1000 : data.createdAt).toLocaleDateString('pt-BR') : '11/11/2026'),
          hasPdf: Boolean(data.hasPdf || data.pdfUrl || rawInst.length > 0),
          doctorName: data.doctorName || 'Dr. João Paulo Cecato',
          instructions: rawInst,
          pdfUrl: data.pdfUrl || ''
        };
      });

      hasLoadedSubReferrals = true;
      lastReferralsError = null;
      cachedSubReferrals = freshRefs;

      const all = this.getAllLocalPatients();
      const currentP = all[patientEmailOrId] || all[targetDocId] || INITIAL_PATIENTS['paciente-template-01'];
      const updatedPatient: PatientProfile = {
        ...currentP,
        referrals: freshRefs
      };
      all[patientEmailOrId] = updatedPatient;
      all[targetDocId] = updatedPatient;
      all['paciente-template-01'] = updatedPatient;
      this.saveAllLocalPatients(all);
      this.notifyListeners(patientEmailOrId, updatedPatient);
      if (targetDocId !== patientEmailOrId) {
        this.notifyListeners(targetDocId, updatedPatient);
      }
      return freshRefs;
    } catch (err: any) {
      lastReferralsError = err?.code || 'permission-denied';
      console.warn("⚠️ [Vittáre Sync] Erro ao atualizar subcoleção referrals sob demanda:", err);
    }

    return cachedSubReferrals;
  }

  public getAnthropometrySyncError(): string | null {
    return lastAnthroError;
  }

  public computeAssessmentComparisons(assessments: PhysicalAssessmentItem[]): AssessmentComparisonMetric[] {
    if (!assessments || assessments.length < 2) return [];

    const parsePtDate = (dStr: string): number => {
      const match = dStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (!match) return 0;
      return new Date(parseInt(match[3], 10), parseInt(match[2], 10) - 1, parseInt(match[1], 10)).getTime();
    };

    const sorted = [...assessments].sort((a, b) => parsePtDate(a.dateStr) - parsePtDate(b.dateStr));

    const metricsDef = [
      { key: 'weight', name: 'Peso', unit: 'kg', ref: 'Meta clínica: 75,0 kg', higherIsBetter: false },
      { key: 'bodyFat', name: '% de Gordura', unit: '%', ref: 'Meta clínica: < 20%', higherIsBetter: false },
      { key: 'muscleMass', name: '% de Massa Muscular', unit: '%', ref: 'Meta clínica: > 35%', higherIsBetter: true },
      { key: 'waistCircumference', name: 'Circunferência Abdominal', unit: 'cm', ref: 'Ref. < 94 cm', higherIsBetter: false },
      { key: 'visceralFat', name: 'Gordura Visceral', unit: '', ref: 'Ref. Nível 1 a 9', higherIsBetter: false }
    ];

    const result: AssessmentComparisonMetric[] = [];

    metricsDef.forEach(mDef => {
      const points = sorted
        .filter(item => item.metrics && item.metrics[mDef.key] !== undefined && item.metrics[mDef.key] !== null && item.metrics[mDef.key] !== '')
        .map(item => {
          const valNum = Number(item.metrics![mDef.key]);
          const dateClean = item.dateStr.replace('Data: ', '').trim();
          return {
            date: dateClean,
            value: isNaN(valNum) ? 0 : valNum,
            valueDisplay: `${item.metrics![mDef.key]}${mDef.unit ? ` ${mDef.unit}` : ''}`
          };
        })
        .filter(pt => pt.value > 0);

      if (points.length >= 2) {
        result.push({
          id: `comp-${mDef.key}`,
          name: mDef.name,
          reference: mDef.ref,
          unit: mDef.unit,
          higherIsBetter: mDef.higherIsBetter,
          points
        });
      }
    });

    return result;
  }

  public async refreshPhysicalAssessments(patientEmailOrId: string = 'jcecato@gmail.com'): Promise<PhysicalAssessmentItem[]> {
    if (!isFirebaseConfigured() || !db) {
      return cachedSubAssessments;
    }

    const targetDocId = (patientEmailOrId && patientEmailOrId.includes('@'))
      ? patientEmailOrId.toLowerCase().trim()
      : (auth?.currentUser?.email?.toLowerCase().trim() ||
         (typeof window !== 'undefined' ? localStorage.getItem('vittare_remembered_email')?.toLowerCase().trim() : null) ||
         'jcecato@gmail.com');

    try {
      const colRef = collection(db, 'patients', targetDocId, 'anthropometry');
      let snap;
      try {
        snap = await getDocsFromServer(colRef);
      } catch {
        snap = await getDocs(colRef);
      }

      lastAnthroError = null;

      const rawAssessments: PhysicalAssessmentItem[] = snap.docs.map(docSnap => {
        const data = docSnap.data();
        const createdMs = parseAssessmentTimestampMs(data.createdAt);
        const updatedMs = parseAssessmentTimestampMs(data.updatedAt);
        const rawDate = data.dateStr || (createdMs > 0 ? new Date(createdMs).toLocaleDateString('pt-BR') : '11/11/2026');
        const formattedDate = rawDate.startsWith('Data:') ? rawDate : `Data: ${rawDate}`;
        return {
          id: docSnap.id,
          title: data.title || 'Avaliação Corporal',
          dateStr: formattedDate,
          status: (data.status?.toLowerCase() === 'laudo' || data.status?.toLowerCase() === 'disponível') ? 'laudo' : 'aguardando',
          pdfAvailable: Boolean(data.pdfAvailable || data.pdfUrl),
          pdfUrl: data.pdfUrl || '',
          metrics: data.metrics || {},
          updatedAt: updatedMs > 0 ? String(updatedMs) : (data.updatedAt || ''),
          createdAt: createdMs > 0 ? createdMs : ''
        };
      });

      const freshAssessments = sortPhysicalAssessmentsDesc(rawAssessments);

      cachedSubAssessments = freshAssessments;

      const latestMetrics = freshAssessments[0]?.metrics || {};
      const all = this.getAllLocalPatients();
      const currentP = all[patientEmailOrId] || all[targetDocId] || INITIAL_PATIENTS['paciente-template-01'];

      const updatedProgress = latestMetrics ? {
        ...currentP.progress,
        currentWeight: (latestMetrics.weight !== undefined && latestMetrics.weight !== '') ? Number(latestMetrics.weight) : currentP.progress.currentWeight,
        bodyFat: (latestMetrics.bodyFat !== undefined && latestMetrics.bodyFat !== '') ? Number(latestMetrics.bodyFat) : currentP.progress.bodyFat,
        muscleMass: (latestMetrics.muscleMass !== undefined && latestMetrics.muscleMass !== '') ? Number(latestMetrics.muscleMass) : currentP.progress.muscleMass,
        visceralFat: (latestMetrics.visceralFat !== undefined && latestMetrics.visceralFat !== '') ? Number(latestMetrics.visceralFat) : currentP.progress.visceralFat,
        waistCircumference: (latestMetrics.waistCircumference !== undefined && latestMetrics.waistCircumference !== '') ? Number(latestMetrics.waistCircumference) : currentP.progress.waistCircumference,
      } : currentP.progress;

      const derivedComparisons = this.computeAssessmentComparisons(freshAssessments);

      const updatedPatient: PatientProfile = {
        ...currentP,
        physicalAssessments: freshAssessments,
        progress: updatedProgress,
        ...(derivedComparisons.length > 0 ? { physicalAssessmentComparisons: derivedComparisons } : {})
      };

      all[patientEmailOrId] = updatedPatient;
      all[targetDocId] = updatedPatient;
      all['paciente-template-01'] = updatedPatient;
      this.saveAllLocalPatients(all);
      this.notifyListeners(patientEmailOrId, updatedPatient);
      if (targetDocId !== patientEmailOrId) {
        this.notifyListeners(targetDocId, updatedPatient);
      }
      return freshAssessments;
    } catch (err: any) {
      lastAnthroError = err?.code || 'permission-denied';
      console.warn("⚠️ [Vittáre Sync] Erro ao atualizar subcoleção anthropometry sob demanda:", err);
    }

    return cachedSubAssessments;
  }

  public getEvolutionsSyncError(): string | null {
    return lastEvolutionsError;
  }

  public async refreshClinicalEvolutions(patientEmailOrId: string = 'jcecato@gmail.com'): Promise<ClinicalEvolutionItem[]> {
    if (!isFirebaseConfigured() || !db) {
      return cachedSubEvolutions;
    }

    const targetDocId = (patientEmailOrId && patientEmailOrId.includes('@'))
      ? patientEmailOrId.toLowerCase().trim()
      : (auth?.currentUser?.email?.toLowerCase().trim() ||
         (typeof window !== 'undefined' ? localStorage.getItem('vittare_remembered_email')?.toLowerCase().trim() : null) ||
         'jcecato@gmail.com');

    try {
      // Busca documento raiz para Prioridade 1 (consultationRecords) e espelhos longitudinais (activeCheckinQuestions, longitudinalEncounters, etc.)
      let rootData: any = null;
      try {
        const rootRef = doc(db, 'patients', targetDocId);
        let rootSnap;
        try {
          rootSnap = await getDocFromServer(rootRef);
        } catch {
          rootSnap = await getDoc(rootRef);
        }
        if (rootSnap.exists()) {
          rootData = rootSnap.data();
          if (Array.isArray(rootData?.consultationRecords)) {
            cachedRootConsultationRecords = normalizeConsultationRecordsList(rootData.consultationRecords);
          }
        }
      } catch {
        // ignore root fallback read failure
      }

      let snapDocs: any[] = [];
      try {
        const colRef = collection(db, 'patients', targetDocId, 'evolution');
        let snap;
        try {
          snap = await getDocsFromServer(colRef);
        } catch {
          snap = await getDocs(colRef);
        }
        snapDocs = snap.docs;
      } catch (evoColErr: any) {
        lastEvolutionsError = evoColErr?.code || 'permission-denied';
        console.info("🔒 [Vittáre Sync] Subcoleção evolution protegida; utilizando espelhos no documento raiz:", evoColErr?.code);
      }

      let freshEvs: ClinicalEvolutionItem[] = [];
      let resumoRaw: any = null;

      if (snapDocs.length > 0) {
        const summaryDoc = snapDocs.find(d => d.id === 'resumo_geral');
        if (summaryDoc) {
          resumoRaw = summaryDoc.data();
          const normSum = normalizeClinicalSummary({ ...resumoRaw, id: summaryDoc.id });
          if (normSum) cachedClinicalSummaryInfo = normSum;
          cachedResumoConsultationRecords = extractConsultationRecordsFromResumoGeral(resumoRaw);
        } else {
          cachedResumoConsultationRecords = [];
        }

        const encounterDocs = snapDocs.filter(d => isConsultationEncounterDoc(d.id, d.data()));
        freshEvs = sortClinicalEvolutionsDesc(
          encounterDocs.map(docSnap => normalizeClinicalEvolution({ ...docSnap.data(), id: docSnap.id }, docSnap.id))
        );
      } else {
        cachedResumoConsultationRecords = [];
      }

      // Garante leitura dedicada em patients/{email}/evolution/resumo_geral caso a query da coleção falhe ou esteja parcial
      if (!resumoRaw) {
        try {
          const summaryRef = doc(db, 'patients', targetDocId, 'evolution', 'resumo_geral');
          let sumSnap;
          try {
            sumSnap = await getDocFromServer(summaryRef);
          } catch {
            sumSnap = await getDoc(summaryRef);
          }
          if (sumSnap.exists()) {
            resumoRaw = sumSnap.data();
            const normSum = normalizeClinicalSummary({ ...resumoRaw, id: sumSnap.id });
            if (normSum) cachedClinicalSummaryInfo = normSum;
            cachedResumoConsultationRecords = extractConsultationRecordsFromResumoGeral(resumoRaw);
          } else {
            cachedResumoConsultationRecords = [];
          }
        } catch (sumReadErr) {
          console.info("🔒 [Vittáre Sync] Sem acesso direto a evolution/resumo_geral:", sumReadErr);
        }
      }

      const normWellbeing = normalizeWellbeingData(resumoRaw, rootData);
      if (normWellbeing) {
        cachedWellbeingData = normWellbeing;
      }

      if (!cachedClinicalSummaryInfo && typeof rootData?.clinicalSummary === 'string' && rootData.clinicalSummary.trim()) {
        const fallbackDate = rootData.clinicalSummaryDate || (rootData.lastSyncTimestamp ? new Date(rootData.lastSyncTimestamp).toLocaleDateString('pt-BR') : '');
        const normRootSum = normalizeClinicalSummary(rootData.clinicalSummary, fallbackDate);
        if (normRootSum) cachedClinicalSummaryInfo = normRootSum;
      }

      hasLoadedSubEvolution = true;
      cachedSubEvolutions = freshEvs;

      const resolvedConsultationRecords = resolveAuthoritativeConsultationRecords(
        cachedRootConsultationRecords,
        cachedResumoConsultationRecords,
        freshEvs
      );

      const all = this.getAllLocalPatients();
      const currentP = all[patientEmailOrId] || all[targetDocId] || INITIAL_PATIENTS['paciente-template-01'];
      const resolvedWellbeing = cachedWellbeingData || currentP.wellbeingData;

      const updatedPatient: PatientProfile = {
        ...currentP,
        clinicalEvolutions: resolvedConsultationRecords,
        ...(cachedClinicalSummaryInfo ? {
          clinicalSummary: cachedClinicalSummaryInfo.summary,
          clinicalSummaryInfo: cachedClinicalSummaryInfo
        } : {}),
        ...(resolvedWellbeing ? { wellbeingData: resolvedWellbeing } : {})
      };
      all[patientEmailOrId] = updatedPatient;
      all[targetDocId] = updatedPatient;
      all['paciente-template-01'] = updatedPatient;
      this.saveAllLocalPatients(all);
      this.notifyListeners(patientEmailOrId, updatedPatient);
      if (targetDocId !== patientEmailOrId) {
        this.notifyListeners(targetDocId, updatedPatient);
      }
      return resolvedConsultationRecords;
    } catch (err: any) {
      lastEvolutionsError = err?.code || 'permission-denied';
      console.warn("⚠️ [Vittáre Sync] Erro ao atualizar dados de evolução sob demanda:", err);
    }

    return resolveAuthoritativeConsultationRecords(
      cachedRootConsultationRecords,
      cachedResumoConsultationRecords,
      cachedSubEvolutions
    );
  }

  public async refreshWellbeingData(patientEmailOrId: string = 'jcecato@gmail.com'): Promise<WellbeingLongitudinalData | undefined> {
    await this.refreshClinicalEvolutions(patientEmailOrId);
    const all = this.getAllLocalPatients();
    const targetDocId = (patientEmailOrId && patientEmailOrId.includes('@'))
      ? patientEmailOrId.toLowerCase().trim()
      : 'jcecato@gmail.com';
    return cachedWellbeingData || all[targetDocId]?.wellbeingData || all[patientEmailOrId]?.wellbeingData;
  }

  public exportPatientJson(patientId: string): string {
    const all = this.getAllLocalPatients();
    const patient = all[patientId];
    return JSON.stringify(patient, null, 2);
  }

  public async acknowledgeTabUpdate(patientId: string, tabId: string): Promise<void> {
    const all = this.getAllLocalPatients();
    const current = all[patientId];
    if (!current || !current.lyaNotification) return;

    const currentAck = current.lyaNotification.acknowledgedTabs || [];
    if (currentAck.includes(tabId)) {
      return; // Já reconhecido anteriormente
    }

    const updatedAck = [...currentAck, tabId];
    const updatedNotification = {
      ...current.lyaNotification,
      acknowledgedTabs: updatedAck
    };

    const updated: PatientProfile = {
      ...current,
      lyaNotification: updatedNotification
    };

    all[patientId] = updated;
    this.saveAllLocalPatients(all);
    this.notifyListeners(patientId, updated);
  }

  public getPendingUpdates(patient: PatientProfile): { tab: string; label: string }[] {
    if (!patient || !patient.lyaNotification || !patient.lyaNotification.quickLinks) {
      return [];
    }
    const ack = patient.lyaNotification.acknowledgedTabs || [];
    return patient.lyaNotification.quickLinks.filter(link => !ack.includes(link.tab));
  }

  public async resetAcknowledgedTabs(patientId: string): Promise<void> {
    const all = this.getAllLocalPatients();
    const current = all[patientId];
    if (!current || !current.lyaNotification) return;

    await this.updatePatient(patientId, {
      lyaNotification: {
        ...current.lyaNotification,
        acknowledgedTabs: []
      }
    }, 'Reinicialização de Notificações do CRM');
  }

  public resetToDefault(patientId?: string) {
    if (patientId && INITIAL_PATIENTS[patientId]) {
      const all = this.getAllLocalPatients();
      all[patientId] = INITIAL_PATIENTS[patientId];
      this.saveAllLocalPatients(all);
      this.notifyListeners(patientId, INITIAL_PATIENTS[patientId]);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
      Object.keys(INITIAL_PATIENTS).forEach(pid => {
        this.notifyListeners(pid, INITIAL_PATIENTS[pid]);
      });
    }
  }
}

export const crmDataService = new CrmDataService();
