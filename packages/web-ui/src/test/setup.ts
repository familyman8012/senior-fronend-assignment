import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// 테스트 후 자동 정리
afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
});

// 전역 모의 설정
beforeAll(() => {
  // IntersectionObserver 모의
  global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // ResizeObserver 모의
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // crypto.randomUUID 모의
  global.crypto = {
    ...global.crypto,
    randomUUID: vi.fn(() => `test-uuid-${Math.random().toString(36).substr(2, 9)}`),
  };

  // navigator.onLine 모의
  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: true,
  });

  // navigator.connection 모의
  Object.defineProperty(navigator, 'connection', {
    writable: true,
    configurable: true,
    value: {
      effectiveType: '4g',
      rtt: 50,
      downlink: 10,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });

  // URL.createObjectURL 모의
  global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  global.URL.revokeObjectURL = vi.fn();

  // window.scrollTo 모의
  window.scrollTo = vi.fn();
  
  // HTMLElement.scrollIntoView 모의
  Element.prototype.scrollIntoView = vi.fn();

  // window.matchMedia 모의
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // 클립보드 API 모의
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
      readText: vi.fn().mockResolvedValue(''),
    },
  });

  // Service Worker 모의
  Object.defineProperty(navigator, 'serviceWorker', {
    writable: true,
    value: {
      register: vi.fn().mockResolvedValue({}),
      ready: Promise.resolve({}),
    },
  });
});

afterAll(() => {
  vi.restoreAllMocks();
});