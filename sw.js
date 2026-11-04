const CACHE_NAME = 'chess-master-v9.2';

const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './logo.svg',
    './stockfish.js',
    'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js'
];

// Install: Pre-cache core shell & local repository stockfish.js
self.addEventListener('install', function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return Promise.allSettled(
                CORE_ASSETS.map(function(url) {
                    return cache.add(url).catch(function(err) {
                        console.warn('Optional asset skipped:', url);
                    });
                })
            );
        })
    );
});

// Activate: Delete old chess-master-v8.0 cache immediately
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.map(function(key) {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Fetch: Network-First for HTML (so edits show up immediately), Cache-First for engine/assets
self.addEventListener('fetch', function(event) {
    var req = event.request;

    // Never intercept POST requests (such as Gemini 2.5 API calls)
    if (req.method !== 'GET') return;

    var url = new URL(req.url);

    // Do not intercept live PeerJS or Google Gemini API traffic
    if (url.hostname.indexOf('peerjs.com') !== -1 || url.hostname.indexOf('googleapis.com') !== -1) {
        return;
    }

    // Network-First for HTML navigation so you never get stuck on old code
    var isHtmlRequest = req.mode === 'navigate' ||
                        url.pathname.endsWith('.html') ||
                        url.pathname.endsWith('/');

    if (isHtmlRequest) {
        event.respondWith(
            fetch(req).then(function(networkResponse) {
                if (networkResponse && networkResponse.status === 200) {
                    var resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(req, resClone);
                    });
                }
                return networkResponse;
            }).catch(function() {
                return caches.match(req).then(function(cached) {
                    return cached || caches.match('./index.html');
                });
            })
        );
        return;
    }

    // Cache-First with background update for stockfish.js, icons, and PeerJS script
    event.respondWith(
        caches.match(req).then(function(cachedResponse) {
            var networkFetch = fetch(req).then(function(networkResponse) {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    var resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(req, resClone);
                    });
                }
                return networkResponse;
            }).catch(function() {
                return cachedResponse;
            });

            return cachedResponse || networkFetch;
        })
    );
});
