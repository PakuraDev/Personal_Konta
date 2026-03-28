const CACHE_NAME = 'konta-v2-cache-v3';
const ASSETS = [
  './',
  './css/main.css',
  './css/components.css',
  './js/app.js',
  './js/api.js',
  './js/utils.js',
  './js/crypto.js',
  './assets/fonts/Lexend-Variable.ttf',
  './assets/fonts/PlusJakartaSans-Variable.ttf',
  './assets/svg/Camara.svg',
  './assets/svg/Menu.svg',
  './assets/svg/Flecha-Atras.svg',
  './assets/img/icon-192.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Solo cacheamos assets del mismo origen y con método GET
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        // Lanzamos la petición a la red en segundo plano siempre para actualizar la caché
        const fetchPromise = fetch(event.request).then(networkResponse => {
          // Solo guardamos en caché si la respuesta es válida (status 200)
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(err => {
          console.error("Fallo de red al intentar actualizar la caché:", err);
        });

        // ✅ LA LÍNEA SALVAVIDAS: 
        // Devuelve caché si existe, si no, espera a la red.
        return cachedResponse || fetchPromise;
      })
    );
  }
});
