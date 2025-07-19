import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';

const STORAGE_KEY = 'pwa-install-prompt-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7일

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installPWA, getInstallInstructions } = usePWA();
  const [isDismissed, setIsDismissed] = useState(true); // 기본값을 true로
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    // 개발 환경에서는 PWA 프롬프트 표시 안함
    if (import.meta.env.DEV) {
      return;
    }

    const checkDismissStatus = () => {
      try {
        const dismissedData = localStorage.getItem(STORAGE_KEY);
        if (dismissedData) {
          const { timestamp, permanent } = JSON.parse(dismissedData);
          
          if (permanent) {
            setIsDismissed(true);
            return;
          }
          
          const now = Date.now();
          if (now - timestamp < DISMISS_DURATION) {
            setIsDismissed(true);
            return;
          }
        }
        
        // 설치 가능하고 설치되지 않았으면 표시
        if (isInstallable && !isInstalled) {
          setIsDismissed(false);
        }
      } catch (error) {
        console.log('PWA prompt storage error:', error);
        setIsDismissed(true);
      }
    };

    checkDismissStatus();
  }, [isInstallable, isInstalled]);

  // Don't show if already installed, not installable, dismissed, or in development
  if (isInstalled || !isInstallable || isDismissed || import.meta.env.DEV) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installPWA();
    if (!success) {
      // If automatic installation failed, show manual instructions
      setShowInstructions(true);
    } else {
      // 설치 성공하면 영구히 숨김
      saveDismissStatus(true);
      setIsDismissed(true);
    }
  };

  const handleDismiss = (permanent = false) => {
    saveDismissStatus(permanent);
    setIsDismissed(true);
  };

  const saveDismissStatus = (permanent: boolean) => {
    try {
      const dismissData = {
        timestamp: Date.now(),
        permanent
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissData));
    } catch (error) {
      console.log('Failed to save PWA dismiss status:', error);
    }
  };

  const instructions = getInstallInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      {!showInstructions ? (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9m-6-9a9 9 0 1118 0m-9 0a9 9 0 01-9 0" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                오프라인 앱으로 설치
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                인터넷 없어도 채팅 히스토리 확인 • 홈 화면에서 바로 실행 • 더 빠른 로딩
              </p>
            </div>
            <button
              onClick={() => handleDismiss(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              title="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="w-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 px-3 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              앱으로 설치하기
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => handleDismiss(false)}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                나중에 (7일간 숨김)
              </button>
              <button
                onClick={() => handleDismiss(true)}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
              >
                다시 보지 않기
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                수동 설치 방법 ({instructions.platform})
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {instructions.instruction}
              </p>
            </div>
            <button
              onClick={() => handleDismiss(false)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleDismiss(false)}
              className="flex-1 py-2 text-sm font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              확인
            </button>
            <button
              onClick={() => handleDismiss(true)}
              className="flex-1 py-2 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
            >
              다시 보지 않기
            </button>
          </div>
        </>
      )}
    </div>
  );
}