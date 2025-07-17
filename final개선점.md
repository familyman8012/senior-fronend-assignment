# 시니어 프론트엔드 개발자 면접 과제 평가

아래 평가는 "시니어 프론트엔드 개발자"를 채용한다는 관점에서 `packages/web-ui` 모듈을 집중적으로 살펴본 결과입니다.  
(요약 → 장점 → 세부 리뷰 → 개선 제안 → 종합 판단 순으로 정리했습니다)

─────────────────  
## 1. 핵심 요약
─────────────────  
• 모노레포, Vite, React 18, TypeScript strict, Zustand + React-Query, Tailwind, Vitest/Playwright 등을 고르게 활용했습니다.  
• 스트리밍·오프라인·히스토리·가상리스트·A11y 등 요구 사항을 대부분 충족했으며, 전반적인 설계·추상화 수준이 "시니어 중상급" 이상으로 보입니다.  
• 다만 세세한 곳에서 "아쉬운 디테일"과 "안정성·테스트 커버리지"가 일부 부족합니다. 이를 보강하면 합격 가능성은 매우 높습니다.

─────────────────  
## 2. 돋보이는 장점
─────────────────  
### 1) 아키텍처  
   • "스토어(Zustand) + React-Query + Service 계층"으로 의존성을 깔끔히 분리했습니다.  
   • `mock-server.cjs` 연동 → 실서비스 전환을 고려한 `OpenAIService` 랩핑 구조가 현실적입니다.  
   • 메세지/세션/네트워크 상태를 유틸리티 훅으로 캡슐화하여 재사용성을 확보했습니다.

### 2) UX & 성능  
   • 스트림 처리: 한 글자 단위 렌더링, ESC 취소, AbortController 관리 등 실전 수준.  
   • `react-window` + `react-virtualized-auto-sizer`로 대용량 메시지 최적화.  
   • 코드 스플리팅: Markdown/JSON 렌더러 내부에서 lazy-load, oneDark style lazy load 등 TTI 배려.  
   • Vite 빌드에서 manualChunks + terser 세팅으로 번들링 세밀화.

### 3) 접근성(A11y)  
   • Skip Navigation, aria-label, aria-live, focus ring 등 기본 지침 충족.  
   • 키보드 단축키(Ctrl/Cmd+Shift+O)와 focus 관리(사이드바)도 신경 썼습니다.

### 4) 코드 품질  
   • ESLint + TypeScript strict 옵션, 핵심 훅/컴포넌트마다 memo/lazy 최적화.  
   • 중앙집중 오류 핸들러 + 토스트 + ErrorAlert + ErrorBoundary  ⟶ 일관된 UX.

─────────────────  
## 3. 세부 리뷰 & 개선 포인트
─────────────────  

### A) Zustand 스토어  
• `generateId` → `Date.now()` + `Math.random()` 만으로는 극단적 동시성에서 중복 위험이 있습니다. `crypto.randomUUID()` 권장.  
• `saveCurrentChat()` 에서 localStorage 쓰기 후 React-Query invalidation이 없으므로 사이드바 세션과 일부 훅이 갱신되기 전까지 stale 상태가 될 수 있습니다.

### B) 훅 / 컴포넌트  
• `ChatHistory` 초기 세션 로드 로직을 `useState(()=>{...})` 안에 넣어 side-effect를 실행하고 있습니다. 의도는 "마운트 시 한 번"이지만 React 규칙상 `useEffect`가 맞습니다.  
• `ChatHistory` polling (`setInterval`) 은 탭 전환·백그라운드에서 낭비가 큽니다. `storage` 이벤트와 React-Query Invalidation만으로 충분해 보입니다.  
• 사이드바 키보드 이동(focus) 로직이 상당히 복잡합니다. `roving-tabindex` 패턴이나 `useFocusRing` 같은 util을 사용하면 가독성 개선 및 접근성 보강이 가능합니다.

### C) 스트림 처리  
• `OpenAIService.createChatStream()` 반복문에서 `detectedContentType` 로컬 변수는 스트림 최종 완료 전에 setState와의 동기화를 보장하지 못합니다. delta 첫 블록에 `contentType` 있을 때 즉시 store 업데이트하도록 분기했지만 '타이밍 경쟁'(Store side effect vs UI 렌더)이 있을 수 있습니다. → delta가 비었을 때도 contentType만 전달될 수 있으므로 분리 수신 로직을 만드는 편이 안전합니다.  
• ESC 취소 시 이미 완료된 스트림에 대해서는 abort 후 추가 clean-up이 불필요하지만 메세지를 삭제/수정하려다 race condition이 발생할 확률이 있습니다. Abort 후 `finally` 블록에서 `updateMessage(isStreaming:false)` 가 한 번 더 호출되도록 유니파이하면 단순화됩니다.

### D) 보안  
• HTMLRenderer : DOMPurify를 쓰지만 `ADD_TAGS`, `ADD_ATTR` 커스텀 없이 default, 그리고 `style=` 속성을 허용하여 inline CSS가 그대로 반영됩니다. 과제 요구사항(XSS 방지)만 보면 통과지만 실제 서비스라면 style 속성도 sanitize하거나 CSP로 제한해야 합니다.

### E) 테스트  
• 단위 테스트가 핵심 유틸/훅까지 충분히 작성되지 않았습니다. 예: `useChatMutations`, `errorHandling`, `ContentRenderer` 스트리밍 등.  
• e2e는 `chat.spec.ts` 1 개뿐인데, 스트림/오프라인/편집/재생성 시나리오는 추가해야 시니어 급 설득력이 높습니다.

### F) 타입 & 유틸  
• `NetworkInformation` 인터페이스가 전역 declare로 중복 정의되었는데, 불필요한 타입 충돌 가능성(다른 polyfill과). 전용 `d.ts` 에서 `export {};` 추가 권장.  
• JSON 파싱 후 날짜(Date) 재매핑을 매 쿼리마다 수행 → 세션이 커질수록 비용. 저장 시 ISO string, 읽을 때 필요할 때만 변환하도록 개선 가능.

### G) 번들 / 빌드  
• manualChunks 분리 기준이 "includess('react') && !includes('react-')" → `react-dom`이 react-vendor로 묶이지 않을 가능성. 패턴 개선 추천.  
• rollup `treeshake.moduleSideEffects:'no-external'` 설정은 외부 패키지 side-effect 트리쉐이크 위험이 있습니다(예: polyfill 주입). 패키지 타입 선언을 보고 true/false 세분화가 이상적.

─────────────────  
## 4. 빠른 보강 TODO
─────────────────  
### 1) 테스트 강화  
   • 핵심 훅과 ErrorHandler에 Vitest unit test 추가  
   • Playwright e2e: 스트리밍 취소/오프라인/재생성 플로우

### 2) 코드 안정화  
   • `ChatHistory useEffect` 변경, polling 제거  
   • Abort / streaming race condition 통합 정리

### 3) 보안 & DX  
   • HTML sanitization에서 `style` 속성 필터  
   • generateId → `crypto.randomUUID()` 치환  
   • README/CHALLENGE_IMPLEMENTATION에 기술적 의사결정 근거, 한계, 추후 로드맵 명시

─────────────────  
## 5. 종합 평가
─────────────────  
– **설계력**: 요구사항 이상의 기능을 유연한 계층 구조로 구현, 스트림·오프라인·A11y 등 세심한 배려 → 시니어 레벨 "충분".  
– **코드 품질**: 전반적으로 DRY 하고 타입 안정적이지만, 몇몇 세부 구현(사이드 이펙트 관리, 중복 로직)에서 "시니어가 마지막으로 다듬을 부분"이 남아 있습니다.  
– **테스트/안정성**: 시니어급 후보라면 테스트 커버리지∙경계 케이스∙보안 위협 대응에 조금 더 무게를 둬야 합니다.

따라서 **소폭 보강**(테스트 + 세부 안정화)을 하면 "합격" 가능성이 매우 높습니다.  
현재 상태로도 중소 규모 조직에서는 바로 시니어 역할을 수행할 만하지만, 대규모·엄격한 코드리뷰 문화에서는 위 개선 포인트를 먼저 처리하시면 좋겠습니다. 