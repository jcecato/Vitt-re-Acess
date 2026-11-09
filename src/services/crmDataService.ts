import { PatientProfile } from '../types/patient';
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
  type DocumentSnapshot 
} from 'firebase/firestore';

const STORAGE_KEY = 'vittare_patients_store_v12';

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
    physicalAssessments: Array.isArray(raw.physicalAssessments) ? raw.physicalAssessments : (fallback.physicalAssessments || []),
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
    protocols: Array.isArray(raw.protocols) ? raw.protocols : (fallback.protocols || []),
    marketplace: Array.isArray(raw.marketplace) ? raw.marketplace : (fallback.marketplace || []),
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
    referrals: Array.isArray(raw.referrals) ? raw.referrals : (fallback.referrals || []),

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
        const all = this.getAllLocalPatients();
        all[patientData.id] = patientData;
        all['paciente-template-01'] = patientData;
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
    let unsubscribeEmailFirestore: (() => void) | null = null;

    if (isFirebaseConfigured() && db) {
      const firestoreDb = db;
      try {
        const targetDocId = !patientId.startsWith('paciente-') 
          ? patientId 
          : 'jcecato@gmail.com';

        if (targetDocId) {
          const ref = doc(firestoreDb, 'patients', targetDocId);
          unsubscribeFirestore = onSnapshot(
            ref,
            (snapshot: DocumentSnapshot) => {
              if (snapshot.exists()) {
                const raw = snapshot.data();
                const remotePatient = sanitizePatientPayload(raw, targetDocId);
                callback(remotePatient);
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
                  const remoteData = sanitizePatientPayload(docSnap.data(), docSnap.id);
                  callback(remoteData);
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
