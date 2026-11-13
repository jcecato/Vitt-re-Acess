import { PatientProfile, ProtocolItem, ProtocolFormula, ActiveIngredient, ExamBatch, PhysicalAssessmentItem, AssessmentComparisonMetric, ReferralItem } from '../types/patient';
import { INITIAL_PATIENTS } from '../patients/defaultPatient';
import { db, auth, isFirebaseConfigured } from '../config/firebase';
import { 
  doc, 
  getDoc, 
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

const STORAGE_KEY = 'vittare_patients_store_v16';

// Cache persistente em memória das subcoleções oficiais para blindagem contra sobrescrita pelo doc raiz
let cachedSubPrescriptions: ProtocolItem[] = [];
let cachedSubReferrals: ReferralItem[] = [];
let hasLoadedSubReferrals: boolean = false;
let lastReferralsError: string | null = null;
let cachedSubExamBatches: ExamBatch[] = [];
let cachedSubAssessments: PhysicalAssessmentItem[] = [];
let lastAnthroError: string | null = null;

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
                    : (remotePatient.referrals || [])
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

          // Escuta em tempo real na subcoleção /anamnesis (Sense App™ - Avaliação Integrativa)
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
                  const remoteData = sanitizePatientPayload(docSnap.data(), docSnap.id);
                  const mergedProtocols = resolveAuthoritativeProtocols(remoteData.protocols, currentP.protocols);

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
                      : (remoteData.referrals || [])
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
