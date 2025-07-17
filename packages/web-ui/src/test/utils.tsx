import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// 테스트용 QueryClient 생성
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// 커스텀 렌더 함수
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </QueryClientProvider>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// 네트워크 상태 모의 헬퍼
export function mockNetworkStatus(isOnline: boolean, connectionType?: string) {
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: isOnline,
  });

  if (connectionType) {
    Object.defineProperty(navigator, 'connection', {
      writable: true,
      configurable: true,
      value: {
        effectiveType: connectionType,
        rtt: connectionType === 'slow-2g' ? 500 : 50,
        downlink: connectionType === 'slow-2g' ? 0.5 : 10,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  }

  // 이벤트 트리거
  window.dispatchEvent(new Event(isOnline ? 'online' : 'offline'));
}

// localStorage 모의 헬퍼
export function mockLocalStorage(data: Record<string, any>) {
  Object.entries(data).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
}

// 채팅 세션 생성 헬퍼
export function createMockChatSession(overrides = {}) {
  return {
    id: 'test-session-id',
    title: '테스트 대화',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: '안녕하세요',
        contentType: 'text',
        timestamp: new Date('2024-01-01'),
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: '안녕하세요! 무엇을 도와드릴까요?',
        contentType: 'text',
        timestamp: new Date('2024-01-01'),
      },
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

// 메시지 생성 헬퍼
export function createMockMessage(role: 'user' | 'assistant', content: string, overrides = {}) {
  return {
    id: `msg-${Date.now()}`,
    role,
    content,
    contentType: 'text',
    timestamp: new Date(),
    ...overrides,
  };
}

// 대기 헬퍼
export async function waitForAsync(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 재렌더링 대기 헬퍼
export async function waitForRerender() {
  const { act } = await import('@testing-library/react');
  await act(async () => {
    await waitForAsync(0);
  });
}

export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';