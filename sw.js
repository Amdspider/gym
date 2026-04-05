const CACHE_NAME = 'spider-os-v4.2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/main.js',
  '/src/styles/variables.css',
  '/src/styles/base.css',
  '/src/styles/layout.css',
  '/src/styles/components.css',
  '/src/styles/pages.css',
  '/src/js/state/store.js',
  '/src/js/state/firebase.js',
  '/src/js/ai/gemini.js',
  '/src/js/ui/audio.js',
  '/src/js/ui/router.js',
  '/src/js/ui/animations.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});
