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
import { getStorage, type FirebaseStorage } from 'firebase/storage';

/**
 * Configuração Oficial Produção — Projeto vittareacess
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAzRXX2LNY7Y2smzml4KJwCfd4nXlgEuSU",
  authDomain: "vittareacess.firebaseapp.com",
  projectId: "vittareacess",
  storageBucket: "vittareacess.firebasestorage.app",
  messagingSenderId: "660384777581",
  appId: "1:660384777581:web:5222f72c0b97ae925a0664"
};

/**
 * Verifica se a configuração atual é válida
 */
export const isFirebaseConfigured = (): boolean => {
  return (
    FIREBASE_CONFIG.apiKey !== "FIREBASE_API_KEY_PLACEHOLDER" &&
    !FIREBASE_CONFIG.apiKey.includes("PLACEHOLDER")
  );
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let storage: FirebaseStorage | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
    console.info("🔥 [Vittáre Firebase] Conexão com 'vittareacess' inicializada com sucesso!");
  } catch (error) {
    console.warn("⚠️ [Vittáre Firebase] Falha ao inicializar credenciais:", error);
  }
} else {
  console.info(
    "ℹ️ [Vittáre Firebase] Operando em modo desacoplado (Cache Local)."
  );
}

export { app, db, auth, storage };

