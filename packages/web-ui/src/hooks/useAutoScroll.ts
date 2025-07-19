import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoScrollOptions {
  threshold?: number; // 하단으로부터의 거리 (px)
  behavior?: ScrollBehavior;
}

// throttle 함수
function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(undefined, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
}

export function useAutoScroll({ 
  threshold = 100, 
  behavior = 'smooth' 
}: UseAutoScrollOptions = {}) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 스크롤을 맨 아래로 이동 (requestAnimationFrame 사용)
  const scrollToBottom = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(() => {
      scrollEndRef.current?.scrollIntoView({ behavior });
    });
  }, [behavior]);
  
  // throttled 스크롤 핸들러
  const throttledScrollHandler = useCallback(
    throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      const isAtBottomScrollCheck = distanceFromBottom < threshold;
      
      // IntersectionObserver와 중복을 피하기 위해 requestAnimationFrame으로 업데이트
      requestAnimationFrame(() => {
        setIsAtBottom(isAtBottomScrollCheck);
      });
    }, 16), // 60fps로 제한
    [threshold]
  );
  
  // 스크롤 위치 감지 (throttled)
  useEffect(() => {
    window.addEventListener('scroll', throttledScrollHandler, { passive: true });
    throttledScrollHandler(); // 초기 상태 체크
    
    return () => {
      window.removeEventListener('scroll', throttledScrollHandler);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [throttledScrollHandler]);
  
  // IntersectionObserver로 정확한 하단 감지 (보조 역할)
  useEffect(() => {
    if (!scrollEndRef.current) return;
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        // 스크롤 끝 요소가 보이면 확실히 하단에 있음
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            setIsAtBottom(true);
          });
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '0px 0px 50px 0px' // 여유 공간 추가
      }
    );
    
    observerRef.current.observe(scrollEndRef.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return {
    scrollEndRef,
    scrollToBottom,
    isAtBottom,
  };
}