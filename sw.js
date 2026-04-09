const CACHE_NAME = 'spider-os-v4.6';
const ASSET_PATHS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './src/main.js',
  './src/styles/variables.css',
  './src/styles/base.css',
  './src/styles/layout.css',
  './src/styles/components.css',
  './src/styles/pages.css',
  './src/js/state/store.js',
  './src/js/state/firebase.js',
  './src/js/ai/gemini.js',
  './src/js/ui/audio.js',
  './src/js/ui/router.js',
  './src/js/ui/animations.js',
  './src/js/pages/onboarding.js',
  './src/js/pages/habits.js',
  './src/js/pages/gym.js',
  './src/js/pages/nutrition.js',
  './src/js/pages/water.js',
  './src/js/pages/calendar.js',
  './src/js/pages/analytics.js',
  './src/js/pages/history.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const scopedAssets = ASSET_PATHS.map((path) => new URL(path, self.registration.scope).toString());
      await cache.addAll(scopedAssets);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch(() => {
        // Offline fallback for navigations
        if (e.request.mode === 'navigate') {
          return caches.match(new URL('./index.html', self.registration.scope).toString());
        }
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
