import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 안전한 Service Worker 등록 - 프로덕션에서만, 개발에서는 완전 비활성화

// 모바일 디바이스 감지 유틸리티
const isMobileDevice = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0)
    )
  );
};

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // 프로덕션: 안전한 PWA 등록
    window.addEventListener('load', async () => {
      try {
        // 기존 등록된 Service Worker 확인
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        let existingRegistration = null;
        
        for (const registration of existingRegistrations) {
          if (registration.scope === new URL('/', window.location.origin).href) {
            existingRegistration = registration;
            break;
          }
        }
        
        // Service Worker 등록 또는 업데이트
        let registration;
        if (existingRegistration) {
          console.log('[PWA] Existing service worker found, checking for updates...');
          registration = existingRegistration;
          // 수동으로 업데이트 확인
          await registration.update();
        } else {
          console.log('[PWA] Registering new service worker...');
          registration = await navigator.serviceWorker.register('/sw.js');
        }
        
        // 업데이트 감지 및 적용
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available');
                
                const isMobile = isMobileDevice();
                
                // 마지막 업데이트 시간 확인
                const lastUpdateKey = 'pwa-last-update';
                const lastUpdate = localStorage.getItem(lastUpdateKey);
                const now = Date.now();
                const updateInterval = 60000; // 1분 최소 간격
                
                if (lastUpdate && (now - parseInt(lastUpdate)) < updateInterval) {
                  console.log('[PWA] Update skipped - too soon since last update');
                  return;
                }
                
                // 업데이트 시간 기록
                localStorage.setItem(lastUpdateKey, now.toString());
                
                if (isMobile) {
                  // 모바일: 사용자에게 알림 후 업데이트
                  console.log('[PWA] Prompting update on mobile...');
                  if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    setTimeout(() => {
                      window.location.reload();
                    }, 100);
                  }
                } else {
                  // 데스크탑: 즉시 업데이트
                  console.log('[PWA] Applying update (desktop)...');
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                  setTimeout(() => {
                    window.location.reload();
                  }, 100);
                }
              }
            });
          }
        });
        
        // 페이지가 Service Worker 제어를 받을 때까지 대기
        if (!navigator.serviceWorker.controller) {
          await navigator.serviceWorker.ready;
        }
        
      } catch (error) {
        console.warn('[PWA] Service worker registration failed:', error);
        // PWA 실패해도 앱은 정상 작동
      }
    });
  } else {
    // 개발환경: 모든 Service Worker 완전 제거
    navigator.serviceWorker.getRegistrations()
      .then(registrations => {
        registrations.forEach(registration => {
          registration.unregister()
            .then(() => console.log('[DEV] Service Worker unregistered for development'));
        });
      })
      .catch(() => {
        console.log('[DEV] No service workers to unregister');
      });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);