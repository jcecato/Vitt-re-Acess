import { PatientProfile } from '../types/patient';
import { INITIAL_PATIENTS } from '../patients/mockPatientData';
import { db, isFirebaseConfigured } from '../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'vittare_patients_store_v8';

class CrmDataService {
  private listeners: Map<string, Set<(patient: PatientProfile) => void>> = new Map();

  constructor() {
    this.initLocalStorage();
  }

  private initLocalStorage() {
    if (typeof window === 'undefined') return;
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PATIENTS));
    }
  }

  private getAllLocalPatients(): Record<string, PatientProfile> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error("Erro ao ler do localStorage", e);
    }
    return INITIAL_PATIENTS;
  }

  private saveAllLocalPatients(patients: Record<string, PatientProfile>) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    } catch (e) {
      console.error("Erro ao salvar no localStorage", e);
    }
  }

  public async getPatient(patientId: string): Promise<PatientProfile | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const ref = doc(db, 'patients', patientId);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          return snapshot.data() as PatientProfile;
        }
      } catch (err) {
        console.warn("Firebase query falhou, utilizando cache local:", err);
      }
    }

    const all = this.getAllLocalPatients();
    return all[patientId] || null;
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

    const updated: PatientProfile = {
      ...current,
      ...updates,
      lastSyncTimestamp: new Date().toISOString(),
      syncedByProgram: source
    };

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
        unsubscribeFirestore = onSnapshot(ref, (snapshot) => {
          if (snapshot.exists()) {
            const remotePatient = snapshot.data() as PatientProfile;
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
