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
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Mutations: retry up to 2 times for retryable errors
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