import React, { useState, useEffect } from 'react';
import { CoverScreenProps } from './types';
import { useAuth } from '../../auth/AuthContext';
import { VittareLogo } from './VittareLogo';

export const VittareCoverScreen: React.FC<CoverScreenProps> = ({
  isVisible = true,
  onEnter,
  defaultLogin = ''
}) => {
  const { availablePatients, switchPatient, currentPatient } = useAuth();

  // Form State
  const [login, setLogin] = useState<string>(defaultLogin || '');
  const [senha, setSenha] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal State (Recuperação de Senha)
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [recoveryEmail, setRecoveryEmail] = useState<string>('');

  // Listener para fechar modal com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Ação de Login / Entrar (Modo de Testes Sem Senha Conforme Solicitado)
  const handleLoginSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    const emailToMatch = login.trim() || currentPatient?.email || 'paciente@vittare.com';

    // Se o login coincidir com algum paciente disponível, seleciona-o
    const matchedPatient = availablePatients.find(
      p => p.email.toLowerCase() === emailToMatch.toLowerCase() ||
           p.name.toLowerCase().includes(emailToMatch.toLowerCase())
    ) || availablePatients[0];

    if (matchedPatient) {
      switchPatient(matchedPatient.id);
    }

    // Feedback visual idêntico ao script HTML: "Entrando…", seguido da entrada no prontuário
    setTimeout(() => {
      setIsSubmitting(false);
      onEnter();
    }, 600);
  };

  // Handlers do Modal de Recuperação de Senha
  const handleOpenModal = () => {
    setRecoveryEmail(login.includes('@') ? login : '');
    setModalStep(1);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalStep(1);
      setRecoveryEmail('');
    }, 250);
  };

  const handleSendRecoveryEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!recoveryEmail.trim() || !recoveryEmail.includes('@')) {
      return;
    }
    // Ponto preditivo: futuramente disparará sendPasswordResetEmail(auth, recoveryEmail)
    setModalStep(2);
  };

  if (!isVisible) return null;

  return (
    <div className="vittare-cover-wrapper fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none overflow-y-auto">
      {/* Estilos encapsulados com fidelidade 100% ao design solicitado */}
      <style>{`
        .vittare-cover-wrapper {
          --bg: #07090d;
          --stroke: rgba(255, 255, 255, 0.09);
          --text: #eef4f8;
          --muted: #8b9aa7;
          --green: #2fd575;
          --green-2: #12b76a;
          --indigo: #6d7cff;
          --ring: rgba(47, 213, 117, 0.28);
          background: radial-gradient(900px 520px at 85% -10%, rgba(109, 124, 255, 0.16), transparent 60%),
                      radial-gradient(800px 520px at 10% 110%, rgba(18, 183, 106, 0.15), transparent 60%),
                      var(--bg);
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: var(--text);
        }

        .vc-screen {
          width: min(420px, 100%);
          display: flex;
          flex-direction: column;
          gap: 30px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stroke);
          border-radius: 28px;
          padding: 44px 30px 28px;
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
        }

        .vc-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .vc-logo {
          width: 82px;
          height: 82px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 0;
          box-shadow: none;
        }

        .vc-brand {
          margin-top: 6px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: 500;
          font-size: 27px;
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
          margin-top: 4px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-weight: normal;
          font-size: 33px;
          line-height: 1.14;
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
          gap: 7px;
        }

        .vc-group > label {
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 16px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--muted);
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
          color: var(--muted);
          pointer-events: none;
          transition: color 0.2s;
        }

        .vc-field input {
          width: 100%;
          padding: 14px 46px;
          border: 1px solid var(--stroke);
          border-radius: 14px;
          outline: none;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 15px;
          transition: 0.2s;
        }

        .vc-field input::placeholder {
          color: #9aa8b6;
          opacity: 0.85;
        }

        .vc-field input:focus {
          border-color: rgba(47, 213, 117, 0.65);
          box-shadow: 0 0 0 4px var(--ring);
          background: rgba(255, 255, 255, 0.07);
        }

        .vc-field:focus-within .vc-ic {
          color: var(--green);
        }

        .vc-field.vc-mail input {
          padding-right: 16px;
        }

        .vc-eye {
          position: absolute;
          right: 8px;
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 10px;
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: 0.2s;
        }

        .vc-eye:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.06);
        }

        .vc-eye svg {
          width: 18px;
          height: 18px;
        }

        .vc-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .vc-remember {
          display: flex;
          gap: 7px;
          align-items: center;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 14.5px;
          color: var(--muted);
          cursor: pointer;
        }

        .vc-remember input {
          width: 15px;
          height: 15px;
          accent-color: var(--green-2);
          cursor: pointer;
        }

        .vc-row a {
          color: var(--green);
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14.5px;
          text-decoration: none;
          cursor: pointer;
          transition: 0.2s;
        }

        .vc-row a:hover {
          text-decoration: underline;
        }

        .vc-cta {
          margin-top: 4px;
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          color: #052e1b;
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 15.5px;
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

        .vc-cta .vc-arr {
          transition: transform 0.2s;
          display: inline-block;
        }

        .vc-cta:hover .vc-arr {
          transform: translateX(3px);
        }

        .vc-values {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14px;
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

        .vc-rise {
          animation: vcRise 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both;
          animation-delay: var(--d, 0s);
        }

        @keyframes vcRise {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        .vc-modal {
          position: fixed;
          inset: 0;
          z-index: 60;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(4, 6, 10, 0.62);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          opacity: 0;
          pointer-events: none;
          transition: 0.25s;
        }

        .vc-modal.vc-open {
          opacity: 1;
          pointer-events: auto;
        }

        .vc-modal-card {
          position: relative;
          width: min(400px, 100%);
          display: flex;
          flex-direction: column;
          gap: 18px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.03));
          border: 1px solid var(--stroke);
          border-radius: 24px;
          padding: 40px 26px 26px;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
          transform: translateY(14px) scale(0.97);
          transition: 0.25s;
        }

        .vc-modal.vc-open .vc-modal-card {
          transform: none;
        }

        .vc-modal-text {
          font-family: 'Sora', 'Inter', sans-serif;
          font-weight: 600;
          font-size: 20px;
          line-height: 1.4;
          letter-spacing: -0.01em;
          color: var(--text);
        }

        .vc-modal-text span {
          color: var(--green);
        }

        .vc-close {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--muted);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          display: grid;
          place-items: center;
          transition: 0.2s;
        }

        .vc-close:hover {
          color: var(--text);
          background: rgba(255, 255, 255, 0.1);
        }

        .vc-sent-ic {
          width: 56px;
          height: 56px;
          margin: 0 auto;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 24px;
          font-weight: bold;
          color: #052e1b;
          background: linear-gradient(135deg, #5eeaa0, var(--green-2));
          box-shadow: 0 12px 30px rgba(18, 183, 106, 0.4);
        }
      `}</style>

      {/* Cartão Central da Capa */}
      <main className="vc-screen">
        <header className="vc-hero vc-rise" style={{ ['--d' as string]: '0s' }}>
          <div className="vc-logo">
            <VittareLogo size={80} />
          </div>
          <h1 className="vc-brand">
            VITTÁRE ACESS<sup>™</sup>
          </h1>
          <p className="vc-slogan">
            <span>Tudo para seu acompanhamento,</span><br />
            na palma da mão.
          </p>
        </header>

        <form className="vc-form" onSubmit={handleLoginSubmit}>
          {/* Grupo de Login */}
          <div className="vc-group vc-rise" style={{ ['--d' as string]: '0.08s' }}>
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
                placeholder="seu email"
                autoComplete="username"
                value={login}
                onChange={e => setLogin(e.target.value)}
              />
            </div>
          </div>

          {/* Grupo de Senha com Eye Toggle */}
          <div className="vc-group vc-rise" style={{ ['--d' as string]: '0.14s' }}>
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
                value={senha}
                onChange={e => setSenha(e.target.value)}
              />
              <button
                type="button"
                className="vc-eye"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {!showPassword ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Linha de Lembrar Dispositivo e Esqueci Minha Senha */}
          <div className="vc-row vc-rise" style={{ ['--d' as string]: '0.2s' }}>
            <label className="vc-remember">
              <input
                type="checkbox"
                checked={rememberDevice}
                onChange={e => setRememberDevice(e.target.checked)}
              />{' '}
              Lembrar dispositivo
            </label>
            <a onClick={handleOpenModal}>Esqueci minha senha</a>
          </div>

          {/* Botão de Ação CTA (Entrar) */}
          <button
            type="submit"
            className="vc-cta vc-rise"
            style={{ ['--d' as string]: '0.26s' }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span>Entrando…</span>
            ) : (
              <>
                Entrar <span className="vc-arr">→</span>
              </>
            )}
          </button>
        </form>

        {/* Rodapé com Valores da Marca */}
        <footer className="vc-values vc-rise" style={{ ['--d' as string]: '0.32s' }}>
          <span>Acessibilidade</span>
          <i />
          <span>Previsibilidade</span>
        </footer>
      </main>

      {/* Modal de Recuperação de Senha */}
      <div
        className={`vc-modal ${isModalOpen ? 'vc-open' : ''}`}
        aria-hidden={!isModalOpen}
        onClick={e => {
          if (e.target === e.currentTarget) handleCloseModal();
        }}
      >
        <div className="vc-modal-card" role="dialog" aria-modal="true">
          <button
            className="vc-close"
            onClick={handleCloseModal}
            aria-label="Fechar"
          >
            ×
          </button>

          {modalStep === 1 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <p className="vc-modal-text">
                Entre no seu <span>e-mail</span>.<br />
                Encaminhamos para lá inicialmente.
              </p>
              <div className="vc-field vc-mail">
                <svg
                  className="vc-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 6-10 7L2 6" />
                </svg>
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  value={recoveryEmail}
                  onChange={e => setRecoveryEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="vc-cta"
                onClick={handleSendRecoveryEmail}
              >
                Enviar link de recuperação
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="vc-sent-ic">✓</div>
              <p className="vc-modal-text">
                Link enviado!<br />
                Verifique sua caixa de entrada.
              </p>
              <button
                type="button"
                className="vc-cta"
                onClick={handleCloseModal}
              >
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
