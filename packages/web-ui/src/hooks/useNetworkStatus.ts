import { useState, useEffect, useCallback, useRef } from 'react';

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

  // 디바운스된 네트워크 상태 업데이트 (모바일에서 과도한 상태 변화 방지)
  const debouncedUpdateNetworkStatus = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      updateNetworkStatus();
    }, 200); // 200ms 디바운스
  }, [updateNetworkStatus]);

  useEffect(() => {
    // 초기 네트워크 상태 체크
    updateNetworkStatus();

    const handleOnline = () => {
      debouncedUpdateNetworkStatus();
    };

    const handleOffline = () => {
      debouncedUpdateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection API 변경 감지
    const connection = navigator.connection || 
                       navigator.mozConnection || 
                       navigator.webkitConnection;

    if (connection) {
      connection.addEventListener('change', debouncedUpdateNetworkStatus);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if (connection) {
        connection.removeEventListener('change', debouncedUpdateNetworkStatus);
      }
      
      // 디바운스 타이머 정리
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [updateNetworkStatus, debouncedUpdateNetworkStatus]);

  return status;
}