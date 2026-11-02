import React from 'react';
import { VittareCoverScreen } from '../modules/cover';
import { useAuth } from './AuthContext';

export const LoginScreen: React.FC = () => {
  const { switchPatient, availablePatients } = useAuth();

  const handleEnter = () => {
    // Para nosso momento atual de testes sem senhas:
    // Garante que o paciente inicial esteja ativo
    if (availablePatients.length > 0) {
      switchPatient(availablePatients[0].id);
    }
  };

  return <VittareCoverScreen isVisible={true} onEnter={handleEnter} />;
};
