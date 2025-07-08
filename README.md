# 넥스트챕터 시니어 프론트엔드 개발자 채용 과제

## 과제 개요

AI 채팅 인터페이스를 구현하여 다양한 콘텐츠 타입 처리 능력과 실시간 스트리밍 처리 경험을 평가합니다.

**제한 시간**: 48시간

**기술 스택**: 자유 선택 (React, Vue, Vanilla JS 등)

## 프로젝트 구조

이 프로젝트는 pnpm 모노레포로 구성되어 있습니다. 원한다면 다른 패키지 매니저나 구조로 변경해도 무방합니다.

```
senior-frontend-assignment/
├── packages/
│   └── openai-api-mock/    # AI API 모킹 라이브러리
├── package.json
└── pnpm-workspace.yaml
```

## 필수 구현 사항

### 1. 채팅 UI

- 사용자와 AI의 구분되는 말풍선 디자인
- 메시지 입력 폼과 전송 기능
- 스크롤 처리 및 최신 메시지 자동 포커스

### 2. 스트리밍 응답 처리

- `stream: true` 옵션으로 실시간 타이핑 효과 구현
- 글자별 점진적 렌더링
- 스트리밍 중 취소 기능

### 3. 콘텐츠 타입별 렌더링

다음 키워드로 각 타입을 테스트할 수 있습니다:

#### Markdown

- **테스트 메시지**: "markdown 예시를 보여주세요"
- **처리 요구사항**: 제목, 리스트, 코드블록, 테이블 렌더링

#### HTML

- **테스트 메시지**: "html 태그 예시를 주세요"
- **처리 요구사항**: 안전한 HTML 렌더링 (XSS 방지)

#### JSON

- **테스트 메시지**: "json 형태로 데이터를 주세요"
- **처리 요구사항**: 구조화된 JSON 데이터 표시

#### 일반 텍스트

- **테스트 메시지**: "안녕하세요"
- **처리 요구사항**: 기본 텍스트 렌더링

### 4. 에러 및 취소 처리

- 네트워크 오류 시 적절한 에러 메시지
- 요청 중 취소 기능
- 재시도 메커니즘

## 개발 환경 설정

### 패키지 설치

```bash
# pnpm 사용 시
pnpm install
cd packages/openai-api-mock
pnpm build

# 또는 npm 사용 시
npm install
cd packages/openai-api-mock
npm run build
```

### API Mock 서버 사용

```javascript
import { mockOpenAIResponse } from "./packages/openai-api-mock/dist/index.js";
import OpenAI from "openai";

// Mock 활성화
mockOpenAIResponse(true);

// OpenAI 클라이언트 생성
const openai = new OpenAI({
  apiKey: "test-key", // 임의의 키
  dangerouslyAllowBrowser: true, // 브라우저에서 사용 시
});

// 일반 채팅
const response = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [{ role: "user", content: "안녕하세요" }],
});

// 스트리밍 채팅
const stream = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  stream: true,
  messages: [{ role: "user", content: "markdown 예시를 보여주세요" }],
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content || "";
  // UI 업데이트
}
```

## 도전과제 (선택사항)

다음 키워드들을 참고하여 자유롭게 기획하고 구현해보세요:

- 응답 편집, 재생성
- 오프라인 모드
- 채팅 히스토리
- 성능 최적화
- 접근성
- 사용자 경험 개선

구현 방법과 우선순위는 자유입니다. 기획 의도와 구현 과정을 간단히 문서화해주세요.

## 제출 방법

1. **코드**: GitHub 리포지토리 URL
2. **실행 방법**: README.md에 로컬 실행 가이드 포함
3. **도전과제 문서**: 구현한 기능의 기획 의도와 구현 방법 설명

## 질문사항

기술적 질문이나 과제 관련 문의사항이 있으시면 언제든 연락주세요.

---

**참고**: 이 과제는 실제 AI 서비스에서 마주할 수 있는 다양한 응답 형태를 처리하는 능력을 평가하기 위해 설계되었습니다. 완벽한 구현보다는 문제 해결 접근법과 사용자 경험에 대한 고민이 중요합니다.
