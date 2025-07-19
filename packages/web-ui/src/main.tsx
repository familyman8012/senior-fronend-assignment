import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 안전한 Service Worker 등록 - 프로덕션에서만, 개발에서는 완전 비활성화

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // 프로덕션: 안전한 PWA 등록
    window.addEventListener('load', async () => {
      try {
        // 기존 Service Worker가 있으면 먼저 정리
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (registration.scope.includes(window.location.origin)) {
            await registration.unregister();
            console.log('[PWA] Old service worker unregistered');
          }
        }
        
        // 새 Service Worker 등록
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[PWA] Safe PWA service worker registered:', registration.scope);
        
        // 업데이트 감지 및 자동 적용
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available, updating...');
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            });
          }
        });
        
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
      .catch(error => {
        console.log('[DEV] No service workers to unregister');
      });
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);