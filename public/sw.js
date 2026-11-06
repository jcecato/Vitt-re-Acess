const CACHE_NAME = 'vittare-pwa-cache-v5';

// Na instalação, força a ativação imediata substituindo qualquer worker antigo
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Na ativação, limpa e expurga absolutamente TODOS os caches legados
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('🧹 [Vittáre SW] Purgando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia Network-First obrigatória: sempre busca versão mais recente na rede
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Ignora requisições de extensões ou esquemas não-http
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback offline quando sem rede
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
