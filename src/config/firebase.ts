/**
 * ============================================================================
 * VITTÁRE ACESS™ — CONFIGURAÇÃO CENTRAL DO FIREBASE
 * ============================================================================
 * 
 * MARCADOR OFICIAL PARA PREENCHIMENTO POSTERIOR:
 * Insira aqui as credenciais definitivas do seu projeto Firebase fornecidas pelo console.
 * NÃO invente ou altere sem as chaves reais de produção.
 * 
 * Enquanto as credenciais reais não forem preenchidas, o sistema opera automaticamente
 * no modo de sincronização local de alta fidelidade (Offline Cache & Reactive Storage),
 * permitindo testes completos e preservando a arquitetura para integração instantânea.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * ----------------------------------------------------------------------------
 * MARCADOR DE CONFIGURAÇÃO (FIREBASE_CONFIG_PLACEHOLDER)
 * Preencha com as credenciais do seu projeto Firebase:
 * ----------------------------------------------------------------------------
 */
export const FIREBASE_CONFIG = {
  apiKey: "FIREBASE_API_KEY_PLACEHOLDER",
  authDomain: "vittare-crm-patient.firebaseapp.com",
  projectId: "vittare-crm-patient",
  storageBucket: "vittare-crm-patient.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000",
  measurementId: "G-PLACEHOLDER"
};

/**
 * Verifica se a configuração atual é o marcador (placeholder) ou se já possui credenciais reais
 */
export const isFirebaseConfigured = (): boolean => {
  return (
    FIREBASE_CONFIG.apiKey !== "FIREBASE_API_KEY_PLACEHOLDER" &&
    !FIREBASE_CONFIG.apiKey.includes("PLACEHOLDER") &&
    FIREBASE_CONFIG.projectId !== "vittare-crm-patient"
  );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    console.info("🔥 [Vittáre Firebase] Conexão inicializada com sucesso!");
  } catch (error) {
    console.warn("⚠️ [Vittáre Firebase] Falha ao inicializar com credenciais:", error);
  }
} else {
  console.info(
    "ℹ️ [Vittáre Firebase] Operando em modo de arquitetura desacoplada (Cache/Simulação). " +
    "Preencha 'FIREBASE_CONFIG' em 'src/config/firebase.ts' quando as chaves de produção estiverem prontas."
  );
}

export { app, db, auth };
