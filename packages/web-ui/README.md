# AI Chat Interface - Web UI

시니어 프론트엔드 개발자 과제로 구현한 AI 채팅 인터페이스입니다.

## 주요 기능

### 필수 구현 사항
- ✅ **채팅 UI**: 사용자와 AI의 구분되는 말풍선 디자인
- ✅ **스트리밍 응답 처리**: 실시간 타이핑 효과 구현
- ✅ **콘텐츠 타입별 렌더링**: Markdown, HTML, JSON, 일반 텍스트 지원
- ✅ **에러 및 취소 처리**: 네트워크 오류 시 적절한 에러 메시지 및 재시도 메커니즘

### 도전과제 구현
- ✅ **응답 편집/재생성**: 사용자 메시지 편집 및 AI 응답 재생성
- ✅ **오프라인 모드**: Service Worker와 오프라인 큐를 통한 오프라인 지원
- ✅ **채팅 히스토리**: 대화 저장, 검색, 내보내기 (JSON/Markdown)
- ✅ **성능 최적화**: 가상화, 코드 스플리팅, Service Worker 캐싱
- ✅ **접근성**: ARIA 레이블, 키보드 내비게이션, 스크린 리더 지원

## 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS + CSS Modules
- **Testing**: Vitest + React Testing Library + Playwright
- **Content Rendering**:
  - Markdown: react-markdown + remark-gfm
  - HTML: DOMPurify (XSS 방지)
  - Code Highlighting: react-syntax-highlighter
- **Performance**: react-window (가상화)

## 프로젝트 구조

```
src/
├── components/           # UI 컴포넌트
│   ├── Chat/            # 채팅 관련 컴포넌트
│   ├── Message/         # 메시지 관련 컴포넌트
│   ├── ContentRenderer/ # 콘텐츠 타입별 렌더러
│   └── ChatHistory/     # 채팅 히스토리
├── services/            # API 서비스
├── hooks/               # 커스텀 React 훅
├── utils/               # 유틸리티 함수
├── types/               # TypeScript 타입 정의
├── store/               # Zustand 상태 관리
└── __tests__/           # 테스트 파일
```

## 시작하기

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# OpenAI Mock 라이브러리 빌드 (최초 1회)
cd ../openai-api-mock
pnpm build
cd ../web-ui

# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 빌드 결과 미리보기
pnpm preview
```

### 테스트

```bash
# 단위 테스트 실행
pnpm test

# 테스트 커버리지 확인
pnpm test:coverage

# E2E 테스트 실행
pnpm test:e2e

# 테스트 UI 모드
pnpm test:ui
```

## 주요 기능 상세

### 1. 스트리밍 처리
- OpenAI API의 스트리밍 응답을 실시간으로 처리
- 문자 단위 렌더링으로 자연스러운 타이핑 효과
- ESC 키로 스트리밍 취소 가능

### 2. 콘텐츠 타입 감지
메시지에 포함된 키워드로 자동 감지:
- `"markdown"` 또는 `"md"` → Markdown 렌더링
- `"html"` → 안전한 HTML 렌더링 (XSS 방지)
- `"json"` → 구조화된 JSON 뷰어 (트리/원본 보기)
- 기본 → 일반 텍스트 (URL 자동 링크 변환)

### 3. 에러 처리
- Exponential backoff를 사용한 자동 재시도
- 네트워크 상태 감지 및 오프라인 큐
- 사용자 친화적인 에러 메시지

### 4. 채팅 히스토리
- LocalStorage에 대화 자동 저장
- 키워드 검색 기능
- JSON/Markdown 형식으로 내보내기
- 세션별 대화 관리

### 5. 오프라인 지원
- Service Worker로 정적 자산 캐싱
- 오프라인 메시지 큐 (온라인 복귀 시 자동 전송)
- 네트워크 상태 실시간 표시

### 6. 성능 최적화
- React.memo를 통한 불필요한 리렌더링 방지
- 긴 메시지 목록 가상화 (50개 이상)
- 코드 스플리팅으로 번들 크기 최적화
- Service Worker 캐싱 전략

### 7. 접근성
- 모든 인터랙티브 요소에 ARIA 레이블
- 키보드 내비게이션 완벽 지원
- 스크린 리더 호환
- 고대비 모드 지원
- 스킵 네비게이션

## 아키텍처 결정 사항

### 상태 관리 - Zustand
- Redux 대비 보일러플레이트가 적음
- TypeScript 지원이 우수
- 번들 크기가 작음 (2.9KB)
- DevTools 지원

### 스타일링 - Tailwind CSS
- 빠른 프로토타이핑
- 일관된 디자인 시스템
- 사용하지 않는 스타일 자동 제거
- 반응형 디자인 용이

### 테스팅 전략
- **Unit Tests**: 비즈니스 로직과 유틸리티 함수
- **Integration Tests**: 컴포넌트 상호작용
- **E2E Tests**: 주요 사용자 시나리오

### 보안 고려사항
- DOMPurify로 XSS 공격 방지
- 모든 외부 링크에 `rel="noopener noreferrer"`
- Content Security Policy 준비

## 개선 가능한 부분

1. **i18n 지원**: 다국어 지원 추가
2. **테마 시스템**: 다크 모드 지원
3. **실시간 협업**: WebSocket을 통한 실시간 공유
4. **음성 입력**: Web Speech API 활용
5. **파일 첨부**: 이미지/문서 업로드 지원

## 라이선스

This project is part of a technical assessment and is not licensed for public use.