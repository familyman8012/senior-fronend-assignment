# AI 채팅 인터페이스 구현 계획

---

## 1. 아키텍처 설계

### 1.1 프로젝트 구조

```
packages/
└── web-ui/             # 새로운 웹 UI 패키지
    ├── src/
    │   ├── components/     # UI 컴포넌트
    │   │   ├── Chat/
    │   │   ├── Message/
    │   │   └── ContentRenderer/
    │   ├── services/       # API 통신 및 비즈니스 로직
    │   ├── hooks/          # 커스텀 React 훅
    │   ├── utils/          # 유틸리티 함수
    │   ├── types/          # TypeScript 타입 정의
    │   └── tests/          # 테스트 파일
    ├── public/
    └── package.json
└── openai-api-mock/      # 기존 목킹 라이브러리
```

### 1.2 기술 스택

- **Framework**: React 18 + TypeScript
- **State Management**: Zustand (가벼운 상태 관리)
- **Styling**: CSS Modules + Tailwind CSS
- **Testing**: Vitest + React Testing Library + Playwright (E2E)
- **Build Tool**: Vite
- **Markdown**: react-markdown + remark plugins
- **HTML Sanitization**: DOMPurify
- **Code Highlighting**: Prism.js

---

## 2. 핵심 컴포넌트 설계

### 2.1 ChatContainer

- 전체 채팅 UI 관리
- 메시지 리스트, 입력 폼, 스크롤 처리
- 키보드 단축키 지원 (Ctrl+Enter 전송)

### 2.2 MessageBubble

- 사용자/AI 메시지 구분 렌더링
- 타임스탬프, 상태 표시
- 재생성/편집 버튼 (도전과제)

### 2.3 ContentRenderer

- 전략 패턴으로 콘텐츠 타입별 렌더러 구현
- MarkdownRenderer, HTMLRenderer, JSONRenderer, TextRenderer
- XSS 방지 및 안전한 렌더링

### 2.4 StreamingHandler

- 실시간 스트리밍 처리
- `AbortController`로 취소 가능
- 프로그레시브 렌더링 최적화

---

## 3. 스트리밍 및 렌더링

### 3.1 스트리밍 처리

```javascript
// Custom hook for streaming
const useStreamingChat = () => {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController>();

  const sendMessage = async (content: string) => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        stream: true,
        messages: [{ role: "user", content }],
        signal: controller.signal,
      });

      // Progressive rendering
      for await (const chunk of stream) {
        // Update UI incrementally
      }
    } catch (error) {
      // Error handling
    }
  };

  const cancelStream = () => {
    abortControllerRef.current?.abort();
  };

  return { sendMessage, cancelStream, isStreaming };
};
```

### 3.2 콘텐츠 타입 감지 및 렌더링

```javascript
// Content type detection strategy
const detectContentType = (content: string): ContentType => {
  if (content.includes('markdown') || content.includes('md')) return 'markdown';
  if (content.includes('html')) return 'html';
  if (content.includes('json')) return 'json';
  return 'text';
};
```

```javascript
// Renderer factory pattern
const rendererFactory = {
  markdown: MarkdownRenderer,
  html: HTMLRenderer,
  json: JSONRenderer,
  text: TextRenderer,
};
```

---

## 4. 에러 처리 및 복원력

### 4.1 에러 바운더리

- React Error Boundary로 전역 에러 처리
- 컴포넌트 격리된 에러 처리

### 4.2 네트워크 에러 처리

- Exponential backoff 재시도
- 오프라인 감지 및 큐잉 (도전과제)
- 사용자 친화적 에러 메시지

### 4.3 상태 복원

- LocalStorage에 채팅 히스토리 저장
- 새로고침 시 상태 복원
- 메시지 전송 실패 시 재전송 옵션

---

## 5. 성능 최적화

### 5.1 가상화

- react-window로 긴 메시지 리스트 가상화
- 메모리 효율적인 렌더링

### 5.2 메모이제이션

- React.memo로 불필요한 리렌더링 방지
- useMemo/useCallback 적절히 활용

### 5.3 번들 최적화

- 코드 스플리팅 (렌더러별 동적 임포트)
- Tree shaking
- 이미지/폰트 최적화

---

## 6. 테스트 전략

### 6.1 단위 테스트

- 각 컴포넌트 격리 테스트
- 커스텀 훅 테스트
- 유틸리티 함수 테스트

### 6.2 통합 테스트

- 스트리밍 시나리오 테스트
- 에러 처리 플로우 테스트
- 콘텐츠 타입별 렌더링 테스트

### 6.3 E2E 테스트

- Playwright로 실제 사용자 시나리오 테스트
- 크로스 브라우저 테스트
- 성능 메트릭 측정

---

## 7. 도전과제 구현

### 7.1 응답 편집/재생성

- 메시지별 액션 버튼
- 편집 모드 UI
- 히스토리 관리 모드

### 7.2 오프라인 모드

- Service Worker로 오프라인 감지
- IndexedDB에 메시지 큐 저장
- 온라인 복귀 시 자동 동기화

### 7.3 채팅 히스토리

- 세션별 대화 저장
- 검색 기능
- 내보내기 기능 (JSON/Markdown)

### 7.4 접근성

- ARIA 레이블 적용
- 키보드 내비게이션
- 스크린 리더 지원
- 고대비 모드

### 7.5 성능 모니터링

- Web Vitals 측정
- 커스텀 성능 메트릭
- 실시간 모니터링 대시보드

---

## 8. 개발 순서

### 기본 설정 (Day 1)

- 웹 UI 패키지 생성
- 개발 환경 구성
- 기본 컴포넌트 구조

### 핵심 기능 (Day 2-3)

- 채팅 UI 구현
- 스트리밍 처리
- 콘텐츠 렌더러

### 품질 개선 (Day 4)

- 에러 처리
- 테스트 작성
- 성능 최적화

### 도전과제 (Day 5)

- 우선순위에 따라 선택적 구현
- 문서화