// 안전한 최소 PWA Service Worker
// 오직 필수 오프라인 파일들만 캐싱, 앱 업데이트 우선

const CACHE_VERSION = 'safe-pwa-v4';
const OFFLINE_CACHE = 'offline-essentials-v4';

// 오프라인 필수 파일들만 캐싱 (앱 코드는 제외)
const OFFLINE_ESSENTIALS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// 설치 시 필수 파일들만 캐싱
self.addEventListener('install', (event) => {
  console.log('[SW] Installing minimal safe PWA...');
  
  event.waitUntil(
    caches.open(OFFLINE_CACHE)
      .then((cache) => {
        console.log('[SW] Caching offline essentials');
        return cache.addAll(OFFLINE_ESSENTIALS);
      })
      .then(() => {
        console.log('[SW] Installation complete, waiting for skipWaiting signal...');
        // skipWaiting을 자동으로 호출하지 않음 - 클라이언트가 제어
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// 활성화 시 오래된 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    Promise.all([
      // 오래된 캐시 삭제
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== OFFLINE_CACHE && cacheName !== CACHE_VERSION) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 모든 탭에서 즉시 제어권 획득
      self.clients.claim()
    ]).then(() => {
      console.log('[SW] Activation complete');
    })
  );
});

// Fetch 처리 - 업데이트 우선 전략
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // API 요청은 절대 건드리지 않음
  if (url.pathname.startsWith('/api/') || 
      url.hostname.includes('api.') ||
      url.hostname.includes('openai.com')) {
    return; // 네트워크로 직접
  }
  
  // 앱 리소스는 네트워크 우선 + 오프라인 백업 전략
  if (url.pathname.includes('.js') || 
      url.pathname.includes('.css') ||
      url.pathname.includes('/assets/')) {
    event.respondWith(
      // 네트워크 우선으로 최신 버전 가져오기
      fetch(request)
        .then((response) => {
          // 성공하면 캐시에 백업 저장 (오프라인용)
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(OFFLINE_CACHE).then((cache) => {
              cache.put(request, responseClone);
              console.log('[SW] Cached for offline:', url.pathname);
            });
          }
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시 캐시에서 가져오기 (오프라인 지원)
          console.log('[SW] Network failed, trying cache for:', url.pathname);
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                console.log('[SW] Serving cached app resource:', url.pathname);
                return cachedResponse;
              }
              
              // 캐시에도 없으면 빈 응답 (앱 크래시 방지)
              const contentType = url.pathname.includes('.css') ? 'text/css' : 'application/javascript';
              console.warn('[SW] No cache available, returning empty fallback for:', url.pathname);
              return new Response('/* Offline fallback - no cached version */', {
                headers: { 'Content-Type': contentType }
              });
            });
        })
    );
    return;
  }
  
  // HTML 문서는 네트워크 우선, 실패 시에만 캐시
  if (request.destination === 'document' || 
      url.pathname === '/' || 
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 성공한 응답은 캐시하지 않음 (항상 최신 유지)
          return response;
        })
        .catch(() => {
          // 네트워크 실패 시에만 캐시된 페이지 또는 오프라인 페이지
          return caches.match('/').then((cached) => {
            return cached || caches.match('/offline.html');
          });
        })
    );
    return;
  }
  
  // 이미지와 기타 정적 자산은 캐시 우선
  if (request.destination === 'image' || 
      url.pathname.includes('.png') ||
      url.pathname.includes('.jpg') ||
      url.pathname.includes('.svg') ||
      url.pathname.includes('.ico')) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            return cached;
          }
          
          return fetch(request)
            .then((response) => {
              // 성공한 이미지는 캐시
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(OFFLINE_CACHE).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // 1x1 투명 픽셀 반환
              return new Response(
                new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 8, 215, 99, 248, 15, 0, 1, 1, 1, 0, 24, 221, 141, 219, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]),
                { headers: { 'Content-Type': 'image/png' } }
              );
            });
        })
    );
    return;
  }
  
  // 기타 모든 요청은 네트워크로
});

// 메시지 처리 - 모바일에서만 무한 새로고침 방지 안전장치 적용
let lastSkipWaitingTime = 0;
const SKIP_WAITING_COOLDOWN = 2000; // 2초 쿨다운

// 모바일 디바이스 감지 (Service Worker 컨텍스트용)
const isMobileFromUserAgent = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAN_CACHE') {
    event.waitUntil(cleanupCache());
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    const isMobile = isMobileFromUserAgent();
    
    if (isMobile) {
      // 모바일: 쿨다운 적용
      const now = Date.now();
      if (now - lastSkipWaitingTime > SKIP_WAITING_COOLDOWN) {
        console.log('[SW] Processing SKIP_WAITING request (mobile)');
        lastSkipWaitingTime = now;
        self.skipWaiting();
      } else {
        console.log('[SW] SKIP_WAITING ignored - cooldown active (mobile)');
      }
    } else {
      // 데스크탑: 즉시 처리
      console.log('[SW] Processing SKIP_WAITING request (desktop)');
      self.skipWaiting();
    }
  }
});

async function cleanupCache() {
  try {
    const cache = await caches.open(OFFLINE_CACHE);
    const requests = await cache.keys();
    
    // 캐시 크기가 너무 크면 정리
    if (requests.length > 50) {
      console.log('[SW] Cache cleanup - too many entries');
      const oldRequests = requests.slice(0, requests.length - 25);
      await Promise.all(oldRequests.map(req => cache.delete(req)));
    }
  } catch (error) {
    console.error('[SW] Cache cleanup failed:', error);
  }
}

console.log('[SW] Safe PWA Service Worker loaded');