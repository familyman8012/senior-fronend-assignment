const CACHE_NAME = 'chat-app-v3';
const STATIC_CACHE_NAME = 'chat-app-static-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192x192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Static resources cache
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Opened static cache');
        return cache.addAll(urlsToCache);
      }),
      // Runtime cache
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Opened runtime cache');
        return Promise.resolve();
      })
    ])
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Skip API requests - let them go to network (but handle errors gracefully)
  if (event.request.url.includes('/api/') || event.request.url.includes('api.openai.com')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // API request failed - return a meaningful error response
        return new Response(
          JSON.stringify({ 
            error: 'Network unavailable', 
            message: 'Please check your internet connection and try again.' 
          }),
          {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Handle navigation requests (HTML documents)
  if (event.request.destination === 'document' || event.request.url.endsWith('.html') || event.request.url.endsWith('/')) {
    event.respondWith(
      // Network-first strategy for main app
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline fallback - try cached version first, then offline.html
          return caches.match(event.request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // Handle static assets (JS, CSS, images, etc.)
  event.respondWith(
    // Cache-first strategy for static assets
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache successful responses
            if (response && response.status === 200) {
              const responseClone = response.clone();
              
              // Determine which cache to use
              const cacheName = event.request.url.includes('.js') || 
                               event.request.url.includes('.css') || 
                               event.request.url.includes('.png') || 
                               event.request.url.includes('.jpg') || 
                               event.request.url.includes('.svg') ||
                               event.request.url.includes('.ico') ||
                               event.request.url.includes('.woff') ||
                               event.request.url.includes('.woff2')
                               ? STATIC_CACHE_NAME : CACHE_NAME;
              
              caches.open(cacheName).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            
            return response;
          })
          .catch(() => {
            // Network failed, no cache available - return empty response or specific fallback
            if (event.request.destination === 'image') {
              // Return a simple 1x1 transparent pixel for images
              return new Response(
                new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 1, 1, 1, 0, 24, 221, 141, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
                { headers: { 'Content-Type': 'image/png' } }
              );
            }
            // For other resources, return 404
            return new Response('Not Found', { status: 404 });
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, STATIC_CACHE_NAME];

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
  // Take control of all pages
  self.clients.claim();
});

// Message handler for PWA install prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline chat messages (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync-chat') {
      event.waitUntil(
        // Here you could implement retry logic for failed chat messages
        console.log('Background sync triggered for chat messages')
      );
    }
  });
}