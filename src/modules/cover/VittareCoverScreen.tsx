import React, { useState, useEffect } from 'react';
import { CoverScreenProps } from './types';
import { useAuth } from '../../auth/AuthContext';
import { VittareLogo } from './VittareLogo';
import { isTreatmentActive } from '../../utils/securityUtils';
import { crmDataService } from '../../services/crmDataService';
import { auth, db, isFirebaseConfigured } from '../../config/firebase';
import { 
  signInWithEmailAndPassword, 
  setPersistence, 
  indexedDBLocalPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Helper para compatibilidade de senha do Firebase Auth
const formatAuthPassword = (pin: string) => `${pin}#vittare_auth_portal`;

export const VittareCoverScreen: React.FC<CoverScreenProps> = ({
  isVisible = true,
  onEnter,
  defaultLogin = ''
}) => {
  const { availablePatients, switchPatient } = useAuth();

  // Form State
  const [login, setLogin] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [acceptTerms, setAcceptTerms] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Modais
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Esqueci minha senha
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false); // Termos de Uso (CFN / LGPD)

  // Pré-preenchimento ergonômico do e-mail salvo via "Lembrar dispositivo" e aviso de expiração
  useEffect(() => {
    try {
      const notice = localStorage.getItem('vittare_session_expired_notice');
      if (notice) {
        setAuthError(notice);
        localStorage.removeItem('vittare_session_expired_notice');
      }

      const savedEmail = localStorage.getItem('vittare_remembered_email');
      if (savedEmail) {
        setLogin(savedEmail);
        setRememberDevice(true);
      }
    } catch {
      // Ignora falhas de leitura local
    }
  }, []);

  // Listener para fechar modais com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalOpen) handleCloseModal();
        if (isTermsModalOpen) setIsTermsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isTermsModalOpen]);

  // Submissão do Formulário de Acesso Direto
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setAuthError(null);

    const cleanLogin = login.trim();
    const cleanSenha = senha.trim();

    // 1. Validação de Preenchimento Obrigatório
    if (!cleanLogin || !cleanSenha) {
      setAuthError('Por favor, informe seu e-mail e senha de acesso.');
      return;
    }

    // 2. Validação Obrigatória dos Termos de Uso
    if (!acceptTerms) {
      setAuthError('Por favor, confirme o aceite dos Termos de Uso e Sigilo Profissional para prosseguir.');
      return;
    }

    setIsSubmitting(true);

    // Ajusta persistência do Firebase Auth conforme "Lembrar dispositivo"
    if (isFirebaseConfigured() && auth) {
      try {
        await setPersistence(
          auth, 
          rememberDevice ? indexedDBLocalPersistence : browserSessionPersistence
        );
      } catch (pErr) {
        console.warn('Configuração de persistência de sessão:', pErr);
      }
    }

    // Fluxo Principal Estrito: Autenticação via Firebase Auth Puro
    try {
      if (isFirebaseConfigured() && auth) {
        let userCredential = null;

        // Autenticação direta no Firebase Auth com a senha bruta cadastrada no console
        try {
          userCredential = await signInWithEmailAndPassword(auth, cleanLogin, cleanSenha);
        } catch (fErr: any) {
          console.warn('Erro do Firebase Auth:', fErr?.code);

          // Se o paciente existir no Firestore e o PIN do documento bater (modo legado)
          const remotePatientByEmail = await crmDataService.getPatientByEmail(cleanLogin);
          if (remotePatientByEmail && remotePatientByEmail.pin && remotePatientByEmail.pin === cleanSenha) {
            if (rememberDevice) {
              localStorage.setItem('vittare_remembered_email', cleanLogin);
            } else {
              localStorage.removeItem('vittare_remembered_email');
            }

            crmDataService.updatePatient(remotePatientByEmail.id, {
              termsAccepted: true,
              termsAcceptedAt: new Date().toISOString(),
              termsVersion: '2.0-CFN'
            }, 'Aceite de Termos no Login');

            await switchPatient(remotePatientByEmail.id);

            setTimeout(() => {
              setIsSubmitting(false);
              onEnter();
            }, 350);
            return;
          }

          setIsSubmitting(false);
          if (fErr?.code === 'auth/invalid-credential' || fErr?.code === 'auth/wrong-password') {
            setAuthError('Senha incorreta para este paciente.');
          } else if (fErr?.code === 'auth/user-not-found') {
            setAuthError('Paciente não localizado no sistema. Verifique o e-mail cadastrado.');
          } else if (fErr?.code === 'auth/invalid-email') {
            setAuthError('E-mail em formato inválido.');
          } else {
            setAuthError('Senha incorreta para este paciente.');
          }
          return;
        }

        // Se autenticou com sucesso no Firebase Auth
        if (userCredential) {
          const uid = userCredential.user.uid;

          if (db) {
            try {
              const patientRef = doc(db, 'patients', uid);
              await setDoc(patientRef, {
                termsAccepted: true,
                termsAcceptedAt: serverTimestamp(),
                termsVersion: '2.0-CFN'
              }, { merge: true });
            } catch (dbUpErr) {
              console.warn('Atualização de termos no Firestore:', dbUpErr);
            }
          }

          const remotePatientByEmail = await crmDataService.getPatientByEmail(cleanLogin);
          const targetPatientId = remotePatientByEmail?.id || uid;

          // Atualiza o PIN no Firestore para que fique sincronizado com a nova senha digitada
          crmDataService.updatePatient(targetPatientId, {
            pin: cleanSenha,
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: '2.0-CFN'
          }, 'Sincronização de Senha do Firebase Auth');

          if (rememberDevice) {
            localStorage.setItem('vittare_remembered_email', cleanLogin);
            localStorage.setItem('vittare_saved_auth_cred', JSON.stringify({ email: cleanLogin, pass: cleanSenha }));
          } else {
            localStorage.removeItem('vittare_remembered_email');
            localStorage.removeItem('vittare_saved_auth_cred');
          }

          await switchPatient(targetPatientId);

          setTimeout(() => {
            setIsSubmitting(false);
            onEnter();
          }, 350);
          return;
        }
      }

      // Fallback para ambiente local quando Firebase não estiver provisionado
      const remotePatientByEmail = await crmDataService.getPatientByEmail(cleanLogin);
      if (remotePatientByEmail) {
        if (remotePatientByEmail.pin && remotePatientByEmail.pin !== cleanSenha) {
          setIsSubmitting(false);
          setAuthError('Senha incorreta para este paciente.');
          return;
        }

        if (rememberDevice) {
          localStorage.setItem('vittare_remembered_email', cleanLogin);
        } else {
          localStorage.removeItem('vittare_remembered_email');
        }

        crmDataService.updatePatient(remotePatientByEmail.id, {
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          termsVersion: '2.0-CFN'
        }, 'Aceite de Termos no Login');

        await switchPatient(remotePatientByEmail.id);

        setTimeout(() => {
          setIsSubmitting(false);
          onEnter();
        }, 350);
        return;
      }

      // Se não encontrou no Firebase nem no CRM
      setIsSubmitting(false);
      setAuthError('Credenciais não encontradas. Verifique o e-mail e a senha informados pelo seu nutricionista.');

    } catch (err: any) {
      setIsSubmitting(false);
      setAuthError('Erro ao autenticar. Tente novamente.');
    }
  };

  // Handlers do Modal de Recuperação de Senha
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  if (!isVisible) return null;

  return (
    <div className="vc-root">
      <style>{`
        :root {
          --bg: #04070a;
          --card: #090e13;
          --text: #e6edf3;
          --muted: #7d8b99;
          --stroke: rgba(255, 255, 255, 0.08);
          --green: #4ade80;
          --green-2: #16a34a;
          --green-soft: rgba(74, 222, 128, 0.12);
        }

        .vc-root {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background:
            radial-gradient(ellipse 600px 380px at 50% 12%, rgba(22, 163, 74, 0.22), transparent 70%),
            radial-gradient(circle 300px at 50% 100%, rgba(74, 222, 128, 0.10), transparent 60%),
            var(--bg);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--text);
          overflow-y: auto;
        }

        .vc-screen {
          width: min(420px, 100%);
          display: flex;
          flex-direction: column;
          gap: 24px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stroke);
          border-radius: 28px;
          padding: 38px 28px 26px;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
        }

        .vc-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .vc-logo {
          width: 78px;
          height: 78px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
        }

        .vc-brand {
          margin-top: 4px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 500;
          font-size: 26px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #dfe9f2;
        }

        .vc-brand sup {
          color: var(--green);
          font-size: 14px;
          vertical-align: super;
          margin-left: -8px;
        }

        .vc-slogan {
          margin-top: 2px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: normal;
          font-size: 28px;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: #dfe9f2;
        }

        .vc-slogan span {
          font-weight: bold;
          background: linear-gradient(90deg, #8bf0b6, var(--green) 60%, var(--green-2));
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .vc-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }

        .vc-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .vc-group label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #a4b3c2;
        }

        .vc-field {
          position: relative;
          display: flex;
          align-items: center;
        }

        .vc-field .vc-ic {
          position: absolute;
          left: 14px;
          width: 18px;
          height: 18px;
          color: #627282;
          pointer-events: none;
        }

        .vc-field input {
          width: 100%;
          padding: 13px 44px 13px 42px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--stroke);
          border-radius: 12px;
          color: var(--text);
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .vc-field input:focus {
          border-color: var(--green);
          background: rgba(255, 255, 255, 0.06);
        }

        .vc-eye {
          position: absolute;
          right: 8px;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #7d8b99;
          cursor: pointer;
          display: grid;
          place-items: center;
          border-radius: 8px;
        }

        .vc-eye:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.06);
        }

        .vc-eye svg {
          width: 18px;
          height: 18px;
        }

        /* Linha de Opções (Lembrar dispositivo & Esqueci minha senha) */
        .vc-options-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 2px 0;
        }

        .vc-remember {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          user-select: none;
        }

        .vc-remember input {
          width: 16px;
          height: 16px;
          accent-color: var(--green);
          cursor: pointer;
        }

        .vc-forgot-link {
          color: var(--green);
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.2s;
        }

        .vc-forgot-link:hover {
          text-decoration: underline;
        }

        /* Linha de Aceite dos Termos de Uso */
        .vc-terms-row {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 13px;
          color: #94a3b8;
          text-align: left;
        }

        .vc-terms-row input {
          margin-top: 2px;
          width: 16px;
          height: 16px;
          accent-color: var(--green);
          cursor: pointer;
        }

        .vc-terms-btn {
          color: var(--green);
          font-weight: 600;
          text-decoration: underline;
          cursor: pointer;
          background: none;
          border: none;
          padding: 0;
          font-size: inherit;
        }

        .vc-terms-btn:hover {
          color: #86efac;
        }

        .vc-cta {
          margin-top: 4px;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          color: #052e1b;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 18px;
          background: linear-gradient(135deg, #5eeaa0, var(--green-2));
          box-shadow: 0 14px 34px rgba(18, 183, 106, 0.35);
          transition: 0.2s;
        }

        .vc-cta:hover {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        .vc-cta:active {
          transform: scale(0.99);
        }

        .vc-values {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          font-weight: 600;
          font-size: 13px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8b9aa7;
        }

        .vc-values i {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #3a4652;
          display: inline-block;
        }

        /* Modais */
        .vc-modal {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(4, 6, 10, 0.75);
          backdrop-filter: blur(8px);
          opacity: 0;
          pointer-events: none;
          transition: 0.2s;
        }

        .vc-modal.vc-open {
          opacity: 1;
          pointer-events: auto;
        }

        .vc-modal-card {
          position: relative;
          width: min(420px, 100%);
          background: #0d1219;
          border: 1px solid var(--stroke);
          border-radius: 24px;
          padding: 34px 26px 26px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
          text-align: center;
        }

        .vc-modal-text {
          font-weight: 600;
          font-size: 18px;
          line-height: 1.5;
          color: var(--text);
        }

        .vc-modal-text span {
          color: var(--green);
        }

        .vc-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--muted);
          font-size: 18px;
          cursor: pointer;
          display: grid;
          place-items: center;
        }

        .vc-close:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.12);
        }

        .vc-close-thumb {
          width: 64px;
          height: 64px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          color: #e6edf3;
          font-size: 34px;
          line-height: 1;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }

        .vc-close-thumb:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.16);
          border-color: rgba(255, 255, 255, 0.28);
        }

        .vc-close-thumb:active {
          transform: scale(0.94);
        }

        /* Card Específico do Modal de Termos */
        .vc-terms-card {
          position: relative;
          width: min(520px, 100%);
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          background: #0d1219;
          border: 1px solid var(--stroke);
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7);
          text-align: left;
        }

        .vc-terms-scroll {
          overflow-y: auto;
          padding-right: 8px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          font-size: 13.5px;
          line-height: 1.6;
          color: #cbd5e1;
        }
      `}</style>

      {/* Cartão Central da Capa */}
      <main className="vc-screen">
        <header className="vc-hero">
          <div className="vc-logo">
            <VittareLogo size={78} />
          </div>
          <h1 className="vc-brand">
            VITTÁRE ACESS<sup>™</sup>
          </h1>
          <p className="vc-slogan">
            <span>Tudo para seu acompanhamento,</span><br />
            na palma da mão.
          </p>
        </header>

        {/* Formulário de Acesso Direto (Imagem 3) */}
        <form className="vc-form" onSubmit={handleSubmit}>
          {/* Campo: Login */}
          <div className="vc-group">
            <label htmlFor="login">Login</label>
            <div className="vc-field">
              <svg
                className="vc-ic"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <input
                id="login"
                type="text"
                placeholder="seu email @"
                autoComplete="username"
                value={login}
                onChange={e => {
                  setLogin(e.target.value);
                  setAuthError(null);
                }}
              />
            </div>
          </div>

          {/* Campo: Senha */}
          <div className="vc-group">
            <label htmlFor="senha">Senha</label>
            <div className="vc-field">
              <svg
                className="vc-ic"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                id="senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                maxLength={20}
                value={senha}
                onChange={e => {
                  setSenha(e.target.value);
                  setAuthError(null);
                }}
              />
              <button
                type="button"
                className="vc-eye"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {!showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mensagem de Erro */}
          {authError && (
            <div className="bg-[#b42318]/25 border border-[#b42318]/60 text-[#ff9999] p-3.5 rounded-xl text-[17px] italic font-medium text-center leading-relaxed animate-in fade-in duration-200">
              {authError}
            </div>
          )}

          {/* Linha de Opções: Lembrar Dispositivo & Esqueci minha senha */}
          <div className="vc-options-row">
            <label className="vc-remember">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={e => setRememberDevice(e.target.checked)}
              />
              <span>Lembrar dispositivo</span>
            </label>

            <a 
              className="vc-forgot-link" 
              onClick={handleOpenModal}
              role="button"
              tabIndex={0}
            >
              Esqueci minha senha
            </a>
          </div>

          {/* Linha Obrigatória de Aceite dos Termos de Uso (LGPD / CFN) */}
          <div className="vc-terms-row">
            <input
              type="checkbox"
              id="termsCheckbox"
              required
              checked={acceptTerms}
              onChange={e => setAcceptTerms(e.target.checked)}
            />
            <label htmlFor="termsCheckbox" className="cursor-pointer">
              Li e aceito os{' '}
              <button
                type="button"
                className="vc-terms-btn"
                onClick={(e) => {
                  e.preventDefault();
                  setIsTermsModalOpen(true);
                }}
              >
                Termos de Uso
              </button>{' '}
              e a Política de Privacidade (LGPD).
            </label>
          </div>

          {/* Botão de Ação CTA */}
          <button
            type="submit"
            className="vc-cta"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Entrando…</span>
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </form>

        {/* Rodapé com Valores da Marca */}
        <footer className="vc-values">
          <span>Acessibilidade</span>
          <i />
          <span>Previsibilidade</span>
        </footer>
      </main>

      {/* Modal 1: Recuperação de Senha */}
      <div
        className={`vc-modal ${isModalOpen ? 'vc-open' : ''}`}
        aria-hidden={!isModalOpen}
        onClick={e => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}
      >
        <div 
          className="vc-modal-card" 
          role="dialog" 
          aria-modal="true"
          style={{ textAlign: 'left', padding: '28px 24px 20px', maxWidth: '440px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', color: '#cbd5e1', fontSize: '15px', lineHeight: '1.55' }}>
            <p>
              Consulte seu histórico de mensagens no <span style={{ color: '#4ade80', fontWeight: 600 }}>WhatsApp</span> e localize os dados de acesso enviados pela Vittáre após a contratação do serviço.
            </p>
            <p>
              Caso não encontre a mensagem, você poderá solicitar um novo login e senha.
            </p>
            <p>
              <strong style={{ color: '#facc15', fontWeight: 700 }}>Atenção:</strong> Solicite novos dados de acesso somente se realmente não localizar a mensagem original.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: '4px 0 0' }}>
              Agradecemos pela confiança. Estamos à disposição para auxiliá-lo sempre que necessário.
            </p>
          </div>

          {/* Botão de Fechar expandido (dobro do tamanho) no canto inferior direito para o polegar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              className="vc-close-thumb"
              onClick={handleCloseModal}
              aria-label="Fechar mensagem de recuperação"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      {/* Modal 2: Termos de Uso e Sigilo Profissional e Proteção de Dados (Fiel CFN / LGPD) */}
      <div
        className={`vc-modal ${isTermsModalOpen ? 'vc-open' : ''}`}
        aria-hidden={!isTermsModalOpen}
        onClick={e => {
          if (e.target === e.currentTarget) setIsTermsModalOpen(false);
        }}
      >
        <div className="vc-terms-card" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <h3 className="font-semibold text-[17px] text-white font-['Sora',sans-serif] leading-snug">
              Termos de Uso e Sigilo Profissional e Proteção de Dados
            </h3>
            <button
              className="vc-close"
              style={{ position: 'static' }}
              onClick={() => setIsTermsModalOpen(false)}
              aria-label="Fechar"
            >
              ×
            </button>
          </div>

          <div className="vc-terms-scroll">
            <p>
              <strong>1. Sigilo Profissional Nutricional:</strong> As informações, avaliações, registros clínicos, orientações e prescrições disponibilizados neste portal são protegidos pelo sigilo profissional do nutricionista, conforme o Art. 20 do Código de Ética e de Conduta do Nutricionista (Resolução CFN nº 599/2018). O acesso a essas informações é restrito e sua divulgação somente ocorrerá nas hipóteses legalmente admitidas.
            </p>
            <p>
              <strong>2. Proteção de Dados Pessoais (LGPD):</strong> Seus dados pessoais e dados pessoais sensíveis, especialmente informações relacionadas à saúde, são tratados em conformidade com a Lei nº 13.709/2018 (LGPD), para finalidades relacionadas à assistência nutricional, ao acompanhamento clínico, à elaboração de estratégias individualizadas e à continuidade dos serviços profissionais, observadas as bases legais aplicáveis.
            </p>
            <p>
              <strong>3. Prontuário Clínico e Segurança das Informações:</strong> Os registros clínicos e administrativos são mantidos em ambiente digital, com medidas técnicas e administrativas destinadas a proteger a confidencialidade, a integridade e a disponibilidade das informações, conforme a legislação aplicável e a Resolução CFN nº 594/2017. O acesso é restrito às pessoas autorizadas, respeitando o sigilo profissional e a proteção de dados.
            </p>
            <p>
              <strong>4. Atendimento Nutricional Online:</strong> O atendimento a distância é realizado por profissional nutricionista com inscrição ativa no Conselho Regional de Nutricionistas (CRN) e cadastro no e-Nutricionista, conforme exigência da Resolução CFN nº 760/2023. A modalidade observa os princípios éticos, a privacidade e a confidencialidade das informações compartilhadas durante a Telenutrição.
            </p>
            <p>
              <strong>5. Responsabilidade de Acesso:</strong> Suas credenciais de acesso são pessoais e intransferíveis. Não compartilhe sua senha com terceiros. Evite acessar o portal em dispositivos públicos ou compartilhados e, ao finalizar a utilização, encerre sua sessão pelo botão "Sair". Caso identifique acesso não autorizado, comunique imediatamente ao responsável pelo atendimento.
            </p>
            <p>
              <strong>6. Direitos sobre seus Dados:</strong> Você poderá solicitar informações sobre o tratamento de seus dados pessoais, bem como exercer os direitos previstos na LGPD, incluindo acesso, correção e demais solicitações legalmente aplicáveis, mediante os canais de contato disponibilizados pelo responsável pelo tratamento.
            </p>
            <div className="pt-2 border-t border-white/10 text-[13px] text-[#86efac] font-medium">
              <strong>Responsável profissional:</strong> João Paulo Gonçalves Cecato – Nutricionista – CRN-20100054.
            </div>
          </div>

          <button
            type="button"
            className="vc-cta mt-4 !text-[16px] !py-3"
            onClick={() => {
              setAcceptTerms(true);
              setIsTermsModalOpen(false);
            }}
          >
            Li e Concordo com os Termos
          </button>
        </div>
      </div>
    </div>
  );
};
