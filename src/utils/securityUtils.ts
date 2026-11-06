import { PatientProfile } from '../types/patient';
import { auth } from '../config/firebase';

/**
 * Validação de Senha Estrita (4 caracteres: 1 letra minúscula + 3 números diferentes)
 */
export const validateStrictPassword = (pin: string): { isValid: boolean; error?: string } => {
  if (pin.length !== 4) {
    return { isValid: false, error: 'A senha deve conter exatamente 4 caracteres (ex: v123).' };
  }
  
  const hasLowercase = /[a-z]/.test(pin);
  if (!hasLowercase) {
    return { isValid: false, error: 'A senha deve conter pelo menos 1 letra minúscula (a-z).' };
  }

  const digits = pin.match(/\d/g);
  if (!digits || digits.length !== 3) {
    return { isValid: false, error: 'A senha deve conter exatamente 3 números.' };
  }

  const uniqueDigits = new Set(digits);
  if (uniqueDigits.size !== 3) {
    return { isValid: false, error: 'Os 3 números devem ser diferentes entre si (ex: v123, e não v225).' };
  }

  return { isValid: true };
};

/**
 * Interceptação de Ciclo de Vida do Tratamento (startDate até endDate)
 */
export const isTreatmentActive = (patient: PatientProfile): { isActive: boolean; reason?: string } => {
  if (!patient.startDate || !patient.endDate) {
    return { isActive: true };
  }

  const now = new Date();
  
  // Normaliza parsing para evitar que strings YYYY-MM-DD sejam interpretadas em UTC subtraindo 1 dia no Brasil
  const parseLocalDate = (dateStr: string, isEndOfDay: boolean = false): Date => {
    if (dateStr.includes('T')) {
      const d = new Date(dateStr);
      if (isEndOfDay) d.setHours(23, 59, 59, 999);
      return d;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    if (year && month && day) {
      return isEndOfDay 
        ? new Date(year, month - 1, day, 23, 59, 59, 999)
        : new Date(year, month - 1, day, 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    if (isEndOfDay) d.setHours(23, 59, 59, 999);
    return d;
  };

  const start = parseLocalDate(patient.startDate, false);
  const end = parseLocalDate(patient.endDate, true);

  if (now < start) {
    return { isActive: false, reason: 'Seu plano de tratamento ainda não iniciou.' };
  }
  if (now > end) {
    return { isActive: false, reason: 'Seu plano de acompanhamento expirou. Entre em contato com a equipe clínica.' };
  }

  return { isActive: true };
};

/**
 * Sanitização Sequencial Completa de Dispositivo ao Fazer Logout
 */
export const sanitizeDeviceOnLogout = async (): Promise<void> => {
  try {
    if (auth) {
      await auth.signOut();
    }
  } catch (err) {
    console.warn("⚠️ [Vittáre Security] Erro ao fazer signOut no Firebase Auth:", err);
  }

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (err) {
    console.warn("⚠️ [Vittáre Security] Erro ao limpar armazenamentos da sessão:", err);
  }

  try {
    if (window.indexedDB && window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      for (const dbInfo of dbs) {
        if (dbInfo.name && dbInfo.name.includes('vittare')) {
          window.indexedDB.deleteDatabase(dbInfo.name);
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ [Vittáre Security] Erro ao deletar bancos IndexedDB:", err);
  }
};
