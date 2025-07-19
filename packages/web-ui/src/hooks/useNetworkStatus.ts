import { useState, useEffect, useCallback } from 'react';

declare global {
  interface NetworkInformation extends EventTarget {
    readonly effectiveType?: '2g' | '3g' | '4g' | 'slow-2g';
    readonly rtt?: number; // Round-trip time in milliseconds
    readonly downlink?: number; // Downlink speed in megabits per second
    readonly saveData?: boolean;
    onchange?: EventListener;
  }

  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

interface NetworkStatus {
  isOnline: boolean;
  isSlowConnection: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  rtt?: number;
  downlink?: number;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlowConnection: false,
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [realNetworkTest, setRealNetworkTest] = useState(true);

  // 실제 네트워크 연결 테스트 (PWA 환경용)
  const testRealNetworkConnection = useCallback(async () => {
    try {
      // Service Worker를 우회하는 실제 네트워크 테스트
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/manifest.json?_network_test=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const isReallyOnline = response.ok;
      setRealNetworkTest(isReallyOnline);
      return isReallyOnline;
    } catch (error) {
      console.log('[Network Test] Real network unavailable:', (error as Error).name);
      setRealNetworkTest(false);
      return false;
    }
  }, []);

  const updateNetworkStatus = useCallback(async () => {
    const connection = navigator.connection || 
                       navigator.mozConnection || 
                       navigator.webkitConnection;

    // PWA에서는 실제 네트워크 테스트 결과 우선 사용
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as any).standalone === true;
    const isPWA = isStandalone || isInWebAppiOS;
    
    let actualOnlineStatus = navigator.onLine;
    
    if (isPWA || !navigator.onLine) {
      // PWA이거나 이미 오프라인으로 감지된 경우 실제 네트워크 테스트
      actualOnlineStatus = await testRealNetworkConnection();
    }

    const newStatus = {
      isOnline: actualOnlineStatus,
      isSlowConnection: connection ? 
        connection.effectiveType === 'slow-2g' || 
        connection.effectiveType === '2g' || 
        (connection.rtt !== undefined && connection.rtt > 500) : false,
      effectiveType: connection?.effectiveType,
      rtt: connection?.rtt,
      downlink: connection?.downlink,
    };

    // PWA에서 네트워크 상태 디버깅
    console.log('[PWA Network] Status Update:', {
      navigatorOnLine: navigator.onLine,
      realNetworkTest: actualOnlineStatus,
      isPWA,
      isStandalone,
      isInWebAppiOS,
      finalStatus: newStatus.isOnline,
      effectiveType: newStatus.effectiveType
    });

    setStatus(newStatus);
  }, [testRealNetworkConnection]);

  useEffect(() => {
    // 초기 네트워크 상태 체크
    updateNetworkStatus();

    const handleOnline = () => {
      console.log('[PWA Network] Browser online event');
      // 브라우저가 온라인 이벤트 감지해도 실제 네트워크 테스트
      updateNetworkStatus();
    };

    const handleOffline = () => {
      console.log('[PWA Network] Browser offline event');
      // 브라우저가 오프라인 감지하면 즉시 반영
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Service Worker로부터 네트워크 상태 메시지 수신
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NETWORK_STATUS') {
        console.log('[PWA Network] SW network status:', event.data.isOnline);
        setStatus(prev => ({ ...prev, isOnline: event.data.isOnline }));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    // 주기적 네트워크 상태 체크 (PWA에서 중요)
    const intervalId = setInterval(() => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isInWebAppiOS = (window.navigator as any).standalone === true;
      
      if (isStandalone || isInWebAppiOS) {
        // PWA 환경에서는 Service Worker를 통한 네트워크 체크
        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CHECK_NETWORK'
          });
        } else {
          // SW가 없으면 기존 방식
          updateNetworkStatus();
        }
      }
    }, 8000); // 8초마다 체크

    // Listen to connection changes if available
    const connection = navigator.connection || 
                       navigator.mozConnection || 
                       navigator.webkitConnection;

    const handleConnectionChange = () => {
      console.log('[PWA Network] Connection change detected');
      updateNetworkStatus();
    };

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      clearInterval(intervalId);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [updateNetworkStatus]);

  return status;
}