
const CACHE_NAME = 'aisle-be-back-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/cart_logo.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

const API_CACHE = 'aisle-be-back-api-v1';

const isApiRequest = (request) => {
  const url = new URL(request.url);
  return url.origin === self.location.origin && url.pathname.startsWith('/api/');
};

const isCrossOrigin = (request) => {
  return new URL(request.url).origin !== self.location.origin;
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(() => {
      // Pre-caching is best-effort; a failed asset should not block activation.
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

const networkFirst = async (request, cacheName) => {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(cacheName);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match('/');
  }
};

const cacheFirst = async (request) => {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, responseToCache);
    }
    return networkResponse;
  } catch (err) {
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    return new Response('', { status: 503, statusText: 'Offline' });
  }
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // API calls: always hit the network first, fall back to cached response when offline.
  if (isApiRequest(request)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Cross-origin (e.g. Google Fonts, Kroger product images): network-first, no strict caching.
  if (isCrossOrigin(request)) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  // Same-origin app shell and assets: cache-first.
  event.respondWith(cacheFirst(request));
});
