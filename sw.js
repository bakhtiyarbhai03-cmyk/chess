const CACHE_NAME = 'chess-master-v4.0';

const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './logo.svg',
    'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.4/peerjs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js'
];

// Install: Pre-cache core shell & engine scripts
self.addEventListener('install', function(event) {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return Promise.allSettled(
                CORE_ASSETS.map(function(url) {
                    return cache.add(url).catch(function(err) {
                        console.warn('Failed to pre-cache:', url, err);
                    });
                })
            );
        })
    );
});

// Activate: Clean up outdated caches
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

// Fetch: Stale-While-Revalidate for local & CDN files, ignore WebRTC/PeerJS signaling API calls
self.addEventListener('fetch', function(event) {
    var req = event.request;
    if (req.method !== 'GET') return;

    var url = new URL(req.url);

    // Do not intercept live PeerJS WebSocket/signaling broker traffic
    if (url.hostname.indexOf('peerjs.com') !== -1) return;

    event.respondWith(
        caches.match(req, { ignoreSearch: true }).then(function(cachedResponse) {
            var networkFetch = fetch(req).then(function(networkResponse) {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
                    var resClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(req, resClone);
                    });
                }
                return networkResponse;
            }).catch(function() {
                // Offline fallback for navigation requests
                if (req.mode === 'navigate') {
                    return caches.match('./index.html');
                }
                return cachedResponse;
            });

            return cachedResponse || networkFetch;
        })
    );
});
