import { useState, useEffect, useCallback, useRef } from 'react';

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
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const updateNetworkStatus = useCallback(() => {
    const connection = navigator.connection || 
                       navigator.mozConnection || 
                       navigator.webkitConnection;

    const newStatus = {
      isOnline: navigator.onLine,
      isSlowConnection: connection ? 
        connection.effectiveType === 'slow-2g' || 
        connection.effectiveType === '2g' || 
        (connection.rtt !== undefined && connection.rtt > 500) : false,
      effectiveType: connection?.effectiveType,
      rtt: connection?.rtt,
      downlink: connection?.downlink,
    };

    // 상태가 실제로 변경된 경우에만 업데이트 (불필요한 리렌더링 방지)
    setStatus(prevStatus => {
      if (
        prevStatus.isOnline === newStatus.isOnline &&
        prevStatus.isSlowConnection === newStatus.isSlowConnection &&
        prevStatus.effectiveType === newStatus.effectiveType
      ) {
        return prevStatus; // 상태가 동일하면 기존 상태 유지
      }
      return newStatus;
    });
  }, []);

  // Connection API 변경에만 사용되는 디바운스 (모바일에서만 적용)
  const debouncedUpdateForConnectionChange = useCallback(() => {
    const isMobile = isMobileDevice();
    
    if (isMobile) {
      // 모바일에서는 connection API 변화만 디바운스 적용
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        updateNetworkStatus();
      }, 200);
    } else {
      // 데스크탑에서는 즉시 반응
      updateNetworkStatus();
    }
  }, [updateNetworkStatus]);

  useEffect(() => {
    // 초기 네트워크 상태 체크
    updateNetworkStatus();

    // 온라인/오프라인 이벤트는 항상 즉시 반응 (중요한 상태 변화)
    const handleOnline = () => {
      updateNetworkStatus();
    };

    const handleOffline = () => {
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection API 변경 감지
    const connection = navigator.connection || 
                       navigator.mozConnection || 
                       navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', debouncedUpdateForConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', debouncedUpdateForConnectionChange);
      }
      
      // 디바운스 타이머 정리
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [updateNetworkStatus, debouncedUpdateForConnectionChange]);

  return status;
}