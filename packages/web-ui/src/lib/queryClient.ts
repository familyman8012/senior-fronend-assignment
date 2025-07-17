import { QueryClient } from '@tanstack/react-query';
import { shouldRetry } from '@/utils/errorHandling';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        return shouldRetry(error);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분 (v4에서는 cacheTime이었음)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        // 뮤테이션: 재시도 가능한 오류에 대해 최대 2번 재시도
        if (failureCount >= 2) return false;
        return shouldRetry(error);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});