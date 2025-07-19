const CACHE_NAME = 'chat-app-v4';
const STATIC_CACHE_NAME = 'chat-app-static-v4';

// Essential files to cache immediately for offline functionality
const ESSENTIAL_CACHE = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential files
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Caching essential files...');
        return cache.addAll(ESSENTIAL_CACHE);
      }),
      // Initialize runtime cache
      caches.open(CACHE_NAME).then((cache) => {
        console.log('Runtime cache initialized');
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('Service Worker installation complete');
    })
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

  // Handle static assets with aggressive caching for app resources
  const isAppResource = event.request.url.includes('/assets/') || 
                       event.request.url.includes('.js') || 
                       event.request.url.includes('.css') ||
                       event.request.url.includes('.woff') ||
                       event.request.url.includes('.woff2');

  const isStaticAsset = event.request.url.includes('.png') || 
                       event.request.url.includes('.jpg') || 
                       event.request.url.includes('.jpeg') || 
                       event.request.url.includes('.svg') ||
                       event.request.url.includes('.ico') ||
                       event.request.url.includes('.webp');

  if (isAppResource || isStaticAsset) {
    event.respondWith(
      // Cache-first strategy for all static assets
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Serving from cache:', event.request.url);
            return cachedResponse;
          }

          // Not in cache, fetch from network
          console.log('Fetching from network:', event.request.url);
          return fetch(event.request)
            .then((response) => {
              // Cache successful responses immediately and aggressively
              if (response && response.status === 200) {
                const responseClone = response.clone();
                
                // Cache all app resources and static assets
                const cacheName = isAppResource ? STATIC_CACHE_NAME : STATIC_CACHE_NAME;
                
                caches.open(cacheName).then((cache) => {
                  console.log('Caching resource:', event.request.url);
                  cache.put(event.request, responseClone);
                });
              }
              
              return response;
            })
            .catch((error) => {
              console.log('Network failed for:', event.request.url, error);
              
              // Network failed, no cache available
              if (event.request.destination === 'image' || isStaticAsset) {
                // Return a simple 1x1 transparent pixel for images
                return new Response(
                  new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 1, 1, 1, 0, 24, 221, 141, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
                  { headers: { 'Content-Type': 'image/png' } }
                );
              }
              
              // For JS/CSS files that failed to load, return empty content to prevent app crash
              if (isAppResource) {
                const contentType = event.request.url.includes('.css') ? 'text/css' : 'application/javascript';
                return new Response('/* Offline fallback */', { 
                  headers: { 'Content-Type': contentType },
                  status: 200 
                });
              }
              
              // For other resources, return 404
              return new Response('Not Found', { status: 404 });
            });
        })
    );
    return;
  }

  // Handle other requests with network-first
  event.respondWith(
    fetch(event.request).catch(() => {
      return new Response('Offline', { status: 503 });
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