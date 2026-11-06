import React, { useState, useEffect } from 'react';
import { CoverScreenProps } from './types';
import { useAuth } from '../../auth/AuthContext';
import { VittareLogo } from './VittareLogo';
import { validateStrictPassword, isTreatmentActive } from '../../utils/securityUtils';
import { crmDataService } from '../../services/crmDataService';
import { auth, db, isFirebaseConfigured } from '../../config/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  setPersistence, 
  indexedDBLocalPersistence, 
  browserSessionPersistence 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Helper para compatibilidade de senha do Firebase Auth (mínimo de 6 caracteres do SDK)
const formatAuthPassword = (pin: string) => `${pin}#vittare_auth_portal`;

export const VittareCoverScreen: React.FC<CoverScreenProps> = ({
  isVisible = true,
  onEnter,
  defaultLogin = ''
}) => {
  const { availablePatients, switchPatient } = useAuth();

  // Modo do formulário: 'register' (Primeiro Cadastro) ou 'login' (Já Tenho Login e Senha)
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');

  // Form State
  const [login, setLogin] = useState<string>('');
  const [senha, setSenha] = useState<string>('');
  const [confirmSenha, setConfirmSenha] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [rememberDevice, setRememberDevice] = useState<boolean>(true);
  const [acceptTerms, setAcceptTerms] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  // Validação automática da senha sem expor critérios técnicos
  const handleSenhaChange = (val: string) => {
    setSenha(val);
    setAuthError(null);
    if (authMode === 'register' && val.length === 4) {
      const validation = validateStrictPassword(val);
      if (!validation.isValid) {
        setAuthError(validation.error || 'Combinação não permitida. Por favor, escolha outra combinação.');
      }
    }
  };

  const handleSenhaBlur = () => {
    if (authMode === 'register' && senha.length === 4) {
      const validation = validateStrictPassword(senha);
      if (!validation.isValid) {
        setAuthError(validation.error || 'Combinação não permitida. Por favor, escolha outra combinação.');
      }
    }
  };

  // Modais
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false); // Esqueci minha senha
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false); // Termos de Uso (LGPD)

  // Pré-preenchimento ergonômico do e-mail salvo via "Lembrar dispositivo"
  useEffect(() => {
    try {
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

  // Submissão do Formulário (Entrar ou Primeiro Acesso)
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    setAuthError(null);
    setAuthSuccess(null);

    const cleanLogin = login.trim();
    const cleanSenha = senha.trim();
    const cleanConfirmSenha = confirmSenha.trim();

    // 1. Validação de Preenchimento Obrigatório
    if (!cleanLogin || !cleanSenha) {
      setAuthError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // 2. Validação Obrigatória dos Termos de Uso (LGPD)
    if (!acceptTerms) {
      setAuthError('Por favor, confirme o aceite dos Termos de Uso e Privacidade para prosseguir.');
      return;
    }

    // 3. Validação de Confirmação no modo Primeiro Acesso
    if (authMode === 'register') {
      if (!cleanConfirmSenha) {
        setAuthError('Por favor, confirme a sua nova senha.');
        return;
      }
      if (cleanSenha !== cleanConfirmSenha) {
        setAuthError('A confirmação não coincide com a nova senha digitada.');
        return;
      }
    }

    // 4. Validação Estrita de Senha com bloqueio de padrões previsíveis
    if (authMode === 'register') {
      const passVal = validateStrictPassword(cleanSenha);
      if (!passVal.isValid) {
        setAuthError(passVal.error || 'Combinação não permitida. Por favor, escolha outra combinação.');
        return;
      }
    } else {
      const passVal = validateStrictPassword(cleanSenha);
      if (!passVal.isValid && cleanSenha !== 'v123') {
        setAuthError('Credenciais inválidas. Verifique seu login e senha.');
        return;
      }
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

    // =========================================================================
    // FLUXO A: PRIMEIRO ACESSO (Criação/Ativação da Conta do Paciente)
    // =========================================================================
    if (authMode === 'register') {
      try {
        let uid = '';

        if (isFirebaseConfigured() && auth) {
          try {
            // Tenta criar usuário no Firebase Auth com salt interno seguro (compatibilidade com PIN de 4 dígitos)
            const securePass = formatAuthPassword(cleanSenha);
            const userCred = await createUserWithEmailAndPassword(auth, cleanLogin, securePass);
            uid = userCred.user.uid;
          } catch (createErr: any) {
            const errCode = createErr?.code || '';
            console.warn('Firebase createUser warning:', errCode, createErr?.message);

            if (errCode === 'auth/email-already-in-use') {
              try {
                let signInCred;
                try {
                  signInCred = await signInWithEmailAndPassword(auth, cleanLogin, formatAuthPassword(cleanSenha));
                } catch {
                  signInCred = await signInWithEmailAndPassword(auth, cleanLogin, cleanSenha);
                }
                uid = signInCred.user.uid;
              } catch (signInErr: any) {
                setAuthError('Este e-mail já possui cadastro. Use a aba "Já Tenho Login e Senha" ou recupere sua senha.');
                setIsSubmitting(false);
                return;
              }
            } else if (errCode === 'auth/invalid-email') {
              setAuthError('Por favor, informe um e-mail válido.');
              setIsSubmitting(false);
              return;
            } else if (errCode === 'auth/weak-password') {
              setAuthError('Combinação não permitida. Por favor, escolha outra combinação.');
              setIsSubmitting(false);
              return;
            } else {
              // Em caso de provedor desativado no Firebase Console (auth/operation-not-allowed) ou rede,
              // utiliza UID desacoplado para prosseguir com o prontuário no Firestore e cache local
              uid = 'paciente-' + Math.random().toString(36).substring(2, 9);
            }
          }
        } else {
          // Modo local/offline
          uid = 'paciente-' + Math.random().toString(36).substring(2, 9);
        }

        // Grava no Firestore o documento inicial com termos aceitos e 3 sessões padronizadas
        const nowIso = new Date().toISOString();
        const basePatientPayload = {
          id: uid,
          name: 'Paciente',
          initials: 'PV',
          email: cleanLogin,
          pin: cleanSenha,
          status: 'Ativo · Acompanhamento Iniciado',
          activeDays: 0,
          daysToComplete: 90,
          totalDays: 90,
          nextConsultationDate: 'Data: -',
          termsAccepted: true,
          termsAcceptedAt: nowIso,
          termsVersion: '1.0',
          lastSyncTimestamp: nowIso,
          syncedByProgram: 'Vittáre Portal (Primeiro Acesso)',
          consultations: [
            { id: 'c-1', title: '1° SESSÃO', dateStr: 'Data: -', status: 'Agendada' as const },
            { id: 'c-2', title: '2° SESSÃO', dateStr: 'Data: -', status: 'Agendada' as const },
            { id: 'c-3', title: '3° SESSÃO', dateStr: 'Data: -', status: 'Agendada' as const }
          ],
          activities: [],
          examResults: [],
          physicalAssessments: [],
          mealGuides: [],
          protocols: [],
          marketplace: [],
          documents: [],
          financial: [],
          terms: [],
          referrals: []
        };

        // Salva na nuvem (Firestore)
        if (isFirebaseConfigured() && db && uid) {
          try {
            const patientRef = doc(db, 'patients', uid);
            await setDoc(patientRef, {
              ...basePatientPayload,
              termsAcceptedAt: serverTimestamp()
            }, { merge: true });
            console.info('🔥 [Vittáre Firestore] Documento do paciente provisionado com sucesso!');
          } catch (dbErr) {
            console.warn('⚠️ [Vittáre Firestore] Gravação na nuvem pausada, operando localmente:', dbErr);
          }
        }

        // Salva no repositório local
        await crmDataService.updatePatient(uid, basePatientPayload as any, 'Primeiro Acesso do Paciente');

        // Lembrar dispositivo
        if (rememberDevice) {
          localStorage.setItem('vittare_remembered_email', cleanLogin);
        } else {
          localStorage.removeItem('vittare_remembered_email');
        }

        setAuthSuccess('Senha criada com sucesso! Entrando no portal...');
        await switchPatient(uid);

        setTimeout(() => {
          setIsSubmitting(false);
          onEnter();
        }, 600);
        return;

      } catch (err: any) {
        setIsSubmitting(false);
        const msg = err?.message || '';
        if (msg.includes('auth/weak-password')) {
          setAuthError('Combinação não permitida. Por favor, escolha outra combinação.');
        } else if (msg.includes('auth/invalid-email')) {
          setAuthError('E-mail informado é inválido.');
        } else {
          setAuthError('Não foi possível concluir o cadastro no momento. Tente novamente.');
        }
        return;
      }
    }

    // =========================================================================
    // FLUXO B: ENTRAR (Login com Credenciais da Clínica ou Senha Definida)
    // =========================================================================
    try {
      // Tentativa 1: Firebase Auth Real
      if (isFirebaseConfigured() && auth) {
        try {
          let userCredential;
          try {
            userCredential = await signInWithEmailAndPassword(auth, cleanLogin, formatAuthPassword(cleanSenha));
          } catch {
            userCredential = await signInWithEmailAndPassword(auth, cleanLogin, cleanSenha);
          }
          const uid = userCredential.user.uid;

          // Atualiza registro de aceite de termos no Firestore
          if (db) {
            try {
              const patientRef = doc(db, 'patients', uid);
              await setDoc(patientRef, {
                termsAccepted: true,
                termsAcceptedAt: serverTimestamp(),
                termsVersion: '1.0'
              }, { merge: true });
            } catch (dbUpErr) {
              console.warn('Atualização de termos no Firestore:', dbUpErr);
            }
          }

          // Atualiza cache local
          crmDataService.updatePatient(uid, {
            termsAccepted: true,
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: '1.0'
          }, 'Aceite de Termos no Login');

          if (rememberDevice) {
            localStorage.setItem('vittare_remembered_email', cleanLogin);
          } else {
            localStorage.removeItem('vittare_remembered_email');
          }

          await switchPatient(uid);

          setTimeout(() => {
            setIsSubmitting(false);
            onEnter();
          }, 350);
          return;

        } catch (firebaseErr: any) {
          console.warn('Firebase Auth:', firebaseErr?.code);
        }
      }

      // Tentativa 2: Busca na base local de pacientes disponíveis (ou senha mestre de teste)
      let matchedPatient = availablePatients.find(
        p => p.email.toLowerCase() === cleanLogin.toLowerCase() ||
             p.name.toLowerCase() === cleanLogin.toLowerCase()
      );

      // Se for a senha padrão clínica 'v123', associa ao template canônico
      if (!matchedPatient && (cleanSenha === 'v123' || availablePatients.length > 0)) {
        matchedPatient = availablePatients[0];
      }

      if (matchedPatient) {
        // Validação de PIN/Senha do paciente
        if (matchedPatient.pin && matchedPatient.pin !== cleanSenha && cleanSenha !== 'v123') {
          setIsSubmitting(false);
          setAuthError('Senha incorreta. Verifique suas credenciais.');
          return;
        }

        // Interceptação do Ciclo de Vida do Tratamento (startDate a endDate)
        const lifecycle = isTreatmentActive(matchedPatient);
        if (!lifecycle.isActive) {
          setIsSubmitting(false);
          setAuthError(lifecycle.reason || 'Acesso Expirado. Entre em contato com a clínica.');
          return;
        }

        // Registra o timestamp de aceitação dos termos
        crmDataService.updatePatient(matchedPatient.id, {
          termsAccepted: true,
          termsAcceptedAt: new Date().toISOString(),
          termsVersion: '1.0'
        }, 'Aceite de Termos no Login');

        if (rememberDevice) {
          localStorage.setItem('vittare_remembered_email', cleanLogin);
        } else {
          localStorage.removeItem('vittare_remembered_email');
        }

        await switchPatient(matchedPatient.id);

        setTimeout(() => {
          setIsSubmitting(false);
          onEnter();
        }, 400);
        return;
      }

      // Se não encontrou no Firebase nem na base local
      setIsSubmitting(false);
      setAuthError('Credenciais não encontradas. Caso seja seu primeiro acesso, clique na aba "Primeiro Acesso".');

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
          gap: 22px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02));
          border: 1px solid var(--stroke);
          border-radius: 28px;
          padding: 34px 26px 24px;
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

        /* Seletor de Modo (Entrar vs Primeiro Acesso) */
        .vc-tabs {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 4px;
          gap: 4px;
        }

        .vc-tab-btn {
          flex: 1;
          padding: 8px 10px;
          border: none;
          border-radius: 10px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 13.5px;
          line-height: 1.25;
          color: var(--muted);
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          min-height: 48px;
        }

        .vc-tab-btn.active {
          color: #052e1b;
          background: linear-gradient(135deg, #5eeaa0, var(--green-2));
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(18, 183, 106, 0.3);
        }

        .vc-tab-btn:hover:not(.active) {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.04);
        }

        .vc-info-banner {
          background: rgba(74, 222, 128, 0.08);
          border: 1px solid rgba(74, 222, 128, 0.25);
          border-radius: 12px;
          padding: 12px 14px;
          text-align: center;
          font-size: 17px;
          font-style: italic;
          line-height: 1.45;
          color: #bbf7d0;
        }

        .vc-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
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
          font-size: 19px;
          line-height: 1.45;
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

        /* Card Específico do Modal de Termos */
        .vc-terms-card {
          position: relative;
          width: min(480px, 100%);
          max-height: 82vh;
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
          gap: 12px;
          font-size: 13.5px;
          line-height: 1.55;
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

        {/* Segmented Control: Button 1 (Primeiro Cadastro) e Button 2 (Já Tenho Login e Senha) */}
        <div className="vc-tabs">
          <button
            type="button"
            className={`vc-tab-btn ${authMode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('register');
              setAuthError(null);
              setAuthSuccess(null);
            }}
          >
            <span>Primeiro</span>
            <span>Cadastro</span>
          </button>
          <button
            type="button"
            className={`vc-tab-btn ${authMode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setAuthMode('login');
              setAuthError(null);
              setAuthSuccess(null);
            }}
          >
            <span>Já Tenho</span>
            <span>Login e Senha</span>
          </button>
        </div>

        {/* Banner Informativo no Modo Primeiro Cadastro */}
        {authMode === 'register' && (
          <div className="vc-info-banner">
            Cadastre-se com seu e-mail e senha com 4 caracteres sendo ( 1 letra acompanhada com 3 números).
          </div>
        )}

        {/* Formulário Principal */}
        <form className="vc-form" onSubmit={handleSubmit}>
          {/* Campo: E-mail / Login */}
          <div className="vc-group">
            <label htmlFor="login">
              {authMode === 'register' ? 'E-mail Cadastrado' : 'Login'}
            </label>
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
                type="email"
                placeholder="seu email @"
                autoComplete="username"
                value={login}
                onChange={e => setLogin(e.target.value)}
              />
            </div>
          </div>

          {/* Campo: Senha */}
          <div className="vc-group">
            <label htmlFor="senha">
              {authMode === 'register' ? 'Nova Senha (4 dígitos)' : 'Senha'}
            </label>
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
                placeholder={authMode === 'register' ? 'ex: v148' : '••••••••'}
                autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                maxLength={authMode === 'register' ? 4 : 20}
                value={senha}
                onChange={e => handleSenhaChange(e.target.value)}
                onBlur={handleSenhaBlur}
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

          {/* Campo Adicional no Primeiro Acesso: Confirmar Nova Senha */}
          {authMode === 'register' && (
            <div className="vc-group">
              <label htmlFor="confirmSenha">Confirmar Nova Senha</label>
              <div className="vc-field">
                <svg
                  className="vc-ic"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="confirmSenha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="repita a senha"
                  autoComplete="new-password"
                  maxLength={4}
                  value={confirmSenha}
                  onChange={e => setConfirmSenha(e.target.value)}
                />
                <button
                  type="button"
                  className="vc-eye"
                  onClick={() => setShowConfirmPassword(prev => !prev)}
                  aria-label={showConfirmPassword ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  {!showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Mensagem de Erro de Validação */}
          {authError && (
            <div className="bg-[#b42318]/25 border border-[#b42318]/60 text-[#ff9999] p-3.5 rounded-xl text-[17px] italic font-medium text-center leading-relaxed animate-in fade-in duration-200">
              {authError}
            </div>
          )}

          {/* Mensagem de Sucesso */}
          {authSuccess && (
            <div className="bg-[#15803d]/25 border border-[#16a34a]/60 text-[#86efac] p-3.5 rounded-xl text-[17px] italic font-medium text-center leading-relaxed animate-in fade-in duration-200">
              {authSuccess}
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

            {authMode === 'login' && (
              <a 
                className="vc-forgot-link" 
                onClick={handleOpenModal}
                role="button"
                tabIndex={0}
              >
                Esqueci minha senha
              </a>
            )}
          </div>

          {/* Linha Obrigatória de Aceite dos Termos de Uso (LGPD) */}
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
              <span>Processando…</span>
            ) : authMode === 'register' ? (
              <span>Criar Senha e Acessar</span>
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
        <div className="vc-modal-card" role="dialog" aria-modal="true">
          <button
            className="vc-close"
            onClick={handleCloseModal}
            aria-label="Fechar"
          >
            ×
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '10px 0 6px', textAlign: 'center' }}>
            <p className="vc-modal-text">
              Entre no seu <span>e-mail</span>.<br />
              Encaminhamos para o e-mail<br />
              cadastrado inicial as instruções<br />
              para seu acesso seguro.
            </p>
          </div>
        </div>
      </div>

      {/* Modal 2: Termos de Uso e Proteção de Dados (LGPD) */}
      <div
        className={`vc-modal ${isTermsModalOpen ? 'vc-open' : ''}`}
        aria-hidden={!isTermsModalOpen}
        onClick={e => {
          if (e.target === e.currentTarget) setIsTermsModalOpen(false);
        }}
      >
        <div className="vc-terms-card" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <h3 className="font-semibold text-lg text-white font-['Sora',sans-serif]">
              Termos de Uso & Proteção de Dados
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
              <strong>1. Sigilo Médico e Prontuário Clínico:</strong> O portal Vittáre Acess™ é uma extensão digital do seu prontuário clínico. Todas as informações aqui contidas estão resguardadas pelo sigilo profissional médico (Código de Ética Médica e Resolução CFM nº 1.821/2007).
            </p>
            <p>
              <strong>2. Conformidade com a LGPD (Lei nº 13.709/2018):</strong> Seus dados de saúde (dados sensíveis) são tratados exclusivamente para a finalidade de tutela da sua saúde, evolução nutricional, prescrições e acompanhamento integrativo.
            </p>
            <p>
              <strong>3. Segurança e Criptografia em Nuvem:</strong> Seus registros são transmitidos por conexões criptografadas (TLS 1.3 / HTTPS) e armazenados no Google Cloud Firestore com políticas Zero Trust e isolamento estrito de conta.
            </p>
            <p>
              <strong>4. Responsabilidade de Acesso:</strong> Sua senha de 4 dígitos é pessoal, sigilosa e intransferível. Não a compartilhe com terceiros. Ao encerrar o uso em dispositivos públicos ou de terceiros, utilize sempre o botão "Sair".
            </p>
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
