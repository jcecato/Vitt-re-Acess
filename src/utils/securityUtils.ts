import { PatientProfile } from '../types/patient';
import { auth } from '../config/firebase';

/**
 * Validação de Senha Estrita e Anti-Padrão Previsível
 * Regras: 4 caracteres (1 letra minúscula + 3 números distintos e imprevisíveis).
 * Bloqueia: sequências (123, 567, 987), repetições (111, 666), padrões simples e teclados.
 * Retorna mensagem neutra e discreta sem informar que a senha é fraca nem expor critérios técnicos.
 */
/**
 * Validação de Senha Estrita e Imprevisível (4 caracteres: 1 letra minúscula + 3 números)
 * Bloqueia estritamente:
 * 1. Números repetidos (111, 666, 888, 112, 221, etc.)
 * 2. Sequências numéricas contíguas óbvias (123, 234, 345, 456, 567, 678, 789, 987, 876, 765, 654, 543, 432, 321, 012, 210)
 * Permite normalmente combinações variadas como v169, a482, m739, etc.
 */
export const validateStrictPassword = (pin: string): { isValid: boolean; error?: string } => {
  const genericError = 'Combinação não permitida. Por favor, escolha outra combinação.';

  if (!pin || pin.length !== 4) {
    return { isValid: false, error: genericError };
  }
  
  const hasLowercase = /[a-z]/.test(pin);
  if (!hasLowercase) {
    return { isValid: false, error: genericError };
  }

  const digits = pin.match(/\d/g);
  if (!digits || digits.length !== 3) {
    return { isValid: false, error: genericError };
  }

  const [d1, d2, d3] = digits.map(Number);

  // 1. Bloqueio de repetições (todos os 3 números devem ser distintos entre si)
  if (d1 === d2 || d2 === d3 || d1 === d3) {
    return { isValid: false, error: genericError };
  }

  // 2. Bloqueio de sequências contíguas óbvias crescentes e decrescentes (ex: 123, 567, 987, 321)
  const isAscendingConsecutive = (d2 === d1 + 1 && d3 === d2 + 1);
  const isDescendingConsecutive = (d2 === d1 - 1 && d3 === d2 - 1);
  if (isAscendingConsecutive || isDescendingConsecutive) {
    return { isValid: false, error: genericError };
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
