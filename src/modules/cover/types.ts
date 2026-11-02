/**
 * @file types.ts
 * @description Definições tipadas e modelos preditivos para a tela de Capa / Autenticação Vittáre Acess.
 * Preparado para futura sincronização com Firebase Authentication, Google Identity e tokens de sessão.
 */

export interface LoginCredentials {
  login: string;
  password?: string;
  rememberDevice: boolean;
}

export interface PasswordRecoveryRequest {
  email: string;
  requestedAt: string;
  status: 'idle' | 'sending' | 'sent' | 'error';
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  userEmail?: string;
  userName?: string;
  token?: string;
  provider: 'local_test' | 'firebase' | 'oauth';
  lastLoginTimestamp?: string;
}

export interface CoverScreenProps {
  isVisible?: boolean;
  onEnter: () => void;
  defaultLogin?: string;
}
