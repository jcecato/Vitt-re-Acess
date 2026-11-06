import { PatientProfile } from '../types/patient';
import { INITIAL_PATIENTS } from '../patients/defaultPatient';
import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'vittare_patients_store_v9';

/**
 * Escudo Defensivo de Dados (Sanitização profunda contra 'Tela Branca'):
 * Garante que payloads parciais ou nós nulos/undefined enviados pelo CRM Mãe
 * sejam convertidos para estruturas válidas (arrays vazios e objetos default),
 * prevenindo erros do tipo 'TypeError: Cannot read properties of null (reading map)'.
 */
export function sanitizePatientPayload(raw: any, fallbackId: string = 'p1'): PatientProfile {
  const fallback = INITIAL_PATIENTS[fallbackId] || INITIAL_PATIENTS['p1'];
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : fallback.id,
    name: typeof raw.name === 'string' && raw.name ? raw.name : fallback.name,
    initials: typeof raw.initials === 'string' && raw.initials ? raw.initials : fallback.initials,
    avatarUrl: raw.avatarUrl || fallback.avatarUrl || '',
    lastAccess: raw.lastAccess || fallback.lastAccess,
    email: typeof raw.email === 'string' ? raw.email : fallback.email,
    pin: typeof raw.pin === 'string' ? raw.pin : fallback.pin,
    status: raw.status || fallback.status,
    activeDays: typeof raw.activeDays === 'number' ? raw.activeDays : fallback.activeDays,
    daysToComplete: typeof raw.daysToComplete === 'number' ? raw.daysToComplete : fallback.daysToComplete,
    totalDays: typeof raw.totalDays === 'number' ? raw.totalDays : fallback.totalDays,
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
    consultations: Array.isArray(raw.consultations) ? raw.consultations : (fallback.consultations || []),
    examsRequested: raw.examsRequested && typeof raw.examsRequested === 'object' && !Array.isArray(raw.examsRequested) 
      ? raw.examsRequested 
      : (fallback.examsRequested || { id: 'req-1', title: 'Painel Integrativo', dateStr: 'Aguardando' }),
    examResults: Array.isArray(raw.examResults) ? raw.examResults : (fallback.examResults || []),
    examBatches: Array.isArray(raw.examBatches) ? raw.examBatches : (fallback.examBatches || []),
    biomarkerComparisons: Array.isArray(raw.biomarkerComparisons) ? raw.biomarkerComparisons : (fallback.biomarkerComparisons || []),
    physicalAssessments: Array.isArray(raw.physicalAssessments) ? raw.physicalAssessments : (fallback.physicalAssessments || []),
    physicalAssessmentComparisons: Array.isArray(raw.physicalAssessmentComparisons) ? raw.physicalAssessmentComparisons : (fallback.physicalAssessmentComparisons || []),
    mealGuides: Array.isArray(raw.mealGuides) ? raw.mealGuides : (fallback.mealGuides || []),
    protocols: Array.isArray(raw.protocols) ? raw.protocols : (fallback.protocols || []),
    marketplace: Array.isArray(raw.marketplace) ? raw.marketplace : (fallback.marketplace || []),
    documents: Array.isArray(raw.documents) ? raw.documents : (fallback.documents || []),
    financial: Array.isArray(raw.financial) ? raw.financial : (fallback.financial || []),
    terms: Array.isArray(raw.terms) ? raw.terms : (fallback.terms || []),
    referrals: Array.isArray(raw.referrals) ? raw.referrals : (fallback.referrals || []),

    lastSyncTimestamp: raw.lastSyncTimestamp || fallback.lastSyncTimestamp || new Date().toISOString(),
    syncedByProgram: raw.syncedByProgram || fallback.syncedByProgram || 'CRM Vittáre',

    startDate: raw.startDate || fallback.startDate,
    endDate: raw.endDate || fallback.endDate,
    termsAcceptedAt: raw.termsAcceptedAt || fallback.termsAcceptedAt,
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

  public async getPatient(patientId: string): Promise<PatientProfile | null> {
    this.activePatientId = patientId;

    if (isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, 'patients', patientId);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const rawRemote = snapshot.data();
          const remoteData = sanitizePatientPayload(rawRemote, patientId);
          const all = this.getAllLocalPatients();
          all[patientId] = remoteData;
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
    source: string = 'CRM Vittáre Admin'
  ): Promise<PatientProfile> {
    const all = this.getAllLocalPatients();
    const current = all[patientId] || INITIAL_PATIENTS[patientId];
    
    if (!current) {
      throw new Error(`Paciente com ID ${patientId} não encontrado.`);
    }

    const updatedRaw: PatientProfile = {
      ...current,
      ...updates,
      lastSyncTimestamp: new Date().toISOString(),
      syncedByProgram: source
    };

    const updated = sanitizePatientPayload(updatedRaw, patientId);

    all[patientId] = updated;
    this.saveAllLocalPatients(all);

    if (isFirebaseConfigured() && db) {
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
    if (isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, 'patients', patientId);
        unsubscribeFirestore = onSnapshot(ref, (snapshot: DocumentSnapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.data();
            const remotePatient = sanitizePatientPayload(raw, patientId);
            callback(remotePatient);
          }
        });
      } catch (err) {
        console.warn("Falha no listener do Firestore:", err);
      }
    }

    return () => {
      this.listeners.get(patientId)?.delete(callback);
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
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

    await this.updatePatient(patientId, {
      lyaNotification: updatedNotification
    }, 'Reconhecimento de Notificação por Abertura de Aba');
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
