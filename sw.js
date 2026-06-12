const CACHE_NAME = 'chess-master-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './logo.svg',
  './stockfish.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
