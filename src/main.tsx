import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purga automática e atômica de resíduos e caches legados (Auto-Sanitização do Navegador)
if (typeof window !== 'undefined') {
  try {
    const obsoleteKeys = [
      'vittare_patients_store_v9',
      'vittare_patients_store_v8',
      'vittare_patients_store_v7',
      'vittare_patients_store_v10',
    ];
    obsoleteKeys.forEach(k => localStorage.removeItem(k));

    // Se a sessão salva apontar para a paciente fictícia, limpa imediatamente
    const currentSession = localStorage.getItem('vittare_auth_session');
    if (currentSession && (currentSession.includes('maria-paula') || currentSession.includes('maria'))) {
      localStorage.removeItem('vittare_auth_session');
    }

    // Limpa caches antigos do Service Worker via CacheStorage API
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name !== 'vittare-pwa-cache-v5') {
            caches.delete(name);
          }
        });
      });
    }

    // Força atualização de workers registrados
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(reg => reg.update());
      });
    }
  } catch (err) {
    console.warn('Sanitização inicial de cache ignorada:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
