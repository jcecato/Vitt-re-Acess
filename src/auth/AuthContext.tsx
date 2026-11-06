import React, { createContext, useContext, useState, useEffect } from 'react';
import { PatientProfile } from '../types/patient';
import { crmDataService } from '../services/crmDataService';
import { MARIA_PAULA_PATIENT, INITIAL_PATIENTS } from '../patients/defaultPatient';
import { sanitizeDeviceOnLogout } from '../utils/securityUtils';

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
            } else {
              setCurrentPatient(MARIA_PAULA_PATIENT);
              setIsAuthenticated(true);
            }
          });
        }
      } else {
        setCurrentPatient(MARIA_PAULA_PATIENT);
        setIsAuthenticated(true);
      }
    } catch {
      setCurrentPatient(MARIA_PAULA_PATIENT);
      setIsAuthenticated(true);
    }
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
