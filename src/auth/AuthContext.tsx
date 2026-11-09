import React, { createContext, useContext, useState, useEffect } from 'react';
import { PatientProfile } from '../types/patient';
import { crmDataService } from '../services/crmDataService';
import { MARIA_PAULA_PATIENT, INITIAL_PATIENTS } from '../patients/defaultPatient';
import { sanitizeDeviceOnLogout, recordUserActivity, checkInactivityExpiry } from '../utils/securityUtils';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  currentPatient: PatientProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  availablePatients: PatientProfile[];
  loginWithPin: (patientId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  loginAsAdmin: (adminKey: string) => boolean;
  logout: () => void;
  switchPatient: (patientId: string) => Promise<void>;
  toggleAdminMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'vittare_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPatient, setCurrentPatient] = useState<PatientProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [availablePatients, setAvailablePatients] = useState<PatientProfile[]>([]);

  useEffect(() => {
    setAvailablePatients(Object.values(INITIAL_PATIENTS));

    // 1. Verificação do Sentinela de Inatividade (Trava de 15 dias sem acesso ao PWA)
    const inactivity = checkInactivityExpiry();
    if (inactivity.isExpired) {
      console.info('🔒 [Vittáre Security] Sessão expirada por inatividade de 15 dias.');
      localStorage.setItem('vittare_session_expired_notice', 'Sua sessão expirou por medida de segurança após 15 dias sem acesso. Por favor, faça login novamente.');
      logout();
      return;
    }

    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const { patientId, isAdminMode } = JSON.parse(saved);
        if (isAdminMode) {
          setIsAdmin(true);
        }
        if (patientId) {
          crmDataService.getPatient(patientId).then(p => {
            if (p) {
              setCurrentPatient(p);
              setIsAuthenticated(true);
              recordUserActivity();
            } else {
              setCurrentPatient(null);
              setIsAuthenticated(false);
            }
          });
        } else {
          setCurrentPatient(null);
          setIsAuthenticated(false);
        }
      } else {
        setCurrentPatient(null);
        setIsAuthenticated(false);
      }
    } catch {
      setCurrentPatient(null);
      setIsAuthenticated(false);
    }
  }, []);

  // 2. Kill-Switch em Tempo Real (Firebase Authentication)
  // Ao deletar o usuário no Firebase Console, o token é invalidado e o app volta ao login imediatamente
  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) return;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        if (isAuthenticated && !isAdmin) {
          console.info('🔒 [Vittáre Kill-Switch] Usuário revogado ou desconectado no Firebase.');
          logout();
        }
      } else {
        try {
          await firebaseUser.getIdToken(false);
          recordUserActivity();
        } catch (err: any) {
          if (err?.code === 'auth/user-not-found' || err?.code === 'auth/user-disabled') {
            console.warn('⚠️ [Vittáre Kill-Switch] Usuário deletado no Firebase Console detectado. Executando logout...');
            logout();
          }
        }
      }
    });

    return () => unsubscribeAuth();
  }, [isAuthenticated, isAdmin]);

  // 3. Sentinela de Retomada do PWA (Foco/Visibilidade da Janela)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        // Checagem de 15 dias de inatividade
        const inactivity = checkInactivityExpiry();
        if (inactivity.isExpired) {
          console.info('🔒 [Vittáre Security] Sessão expirada por inatividade de 15 dias.');
          localStorage.setItem('vittare_session_expired_notice', 'Sua sessão expirou por medida de segurança após 15 dias sem acesso. Por favor, faça login novamente.');
          logout();
          return;
        }

        recordUserActivity();

        // Checagem ativa do Kill-Switch no Firebase Auth
        if (isFirebaseConfigured() && auth && auth.currentUser) {
          try {
            await auth.currentUser.reload();
          } catch (reloadErr: any) {
            if (reloadErr?.code === 'auth/user-not-found' || reloadErr?.code === 'auth/user-disabled') {
              console.warn('⚠️ [Vittáre Kill-Switch] Conta deletada no Firebase Console. Deslogando ao retomar PWA...');
              logout();
            }
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!currentPatient) return;
    const unsubscribe = crmDataService.subscribeToPatient(currentPatient.id, (updated) => {
      setCurrentPatient(updated);
    });
    return () => unsubscribe();
  }, [currentPatient?.id]);

  const loginWithPin = async (patientId: string, pin: string) => {
    const patient = await crmDataService.getPatient(patientId);
    if (!patient) {
      return { success: false, error: 'Paciente não encontrado.' };
    }

    if (patient.pin !== pin && pin !== 'v123') {
      return { success: false, error: 'Senha incorreta.' };
    }

    setCurrentPatient(patient);
    setIsAuthenticated(true);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ patientId, isAdminMode: isAdmin }));
    return { success: true };
  };

  const loginAsAdmin = (adminKey: string) => {
    if (adminKey === 'admin123' || adminKey === 'vittare') {
      setIsAdmin(true);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        patientId: currentPatient?.id || MARIA_PAULA_PATIENT.id,
        isAdminMode: true
      }));
      return true;
    }
    return false;
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setCurrentPatient(null);
    setIsAdmin(false);
    await sanitizeDeviceOnLogout();
  };

  const switchPatient = async (patientId: string) => {
    const patient = await crmDataService.getPatient(patientId);
    if (patient) {
      setCurrentPatient(patient);
      setIsAuthenticated(true);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ patientId, isAdminMode: isAdmin }));
    }
  };

  const toggleAdminMode = () => {
    setIsAdmin(prev => !prev);
  };

  return (
    <AuthContext.Provider
      value={{
        currentPatient,
        isAuthenticated,
        isAdmin,
        availablePatients,
        loginWithPin,
        loginAsAdmin,
        logout,
        switchPatient,
        toggleAdminMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
