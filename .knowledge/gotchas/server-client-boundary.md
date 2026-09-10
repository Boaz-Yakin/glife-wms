# Gotcha: Server/Client 컴포넌트 경계선 및 보안

## 문제 상황
Next.js App Router에서 컴포넌트 간 'use client' 경계선이 모호해지면 서버 사이드 비밀 키나 무거운 서버 전용 모듈이 클라이언트 자바스크립트 번들에 포함되어 보안 위험 및 번들 비대화가 발생합니다.

## 핵심 가이드라인

### 1. `server-only` 패키지 활용
서버 전용 서비스 모듈(`src/services/*`) 상단에 `import 'server-only'`를 명시하여 클라이언트 컴포넌트에서 실수로 import할 경우 빌드 타임에 에러를 발생시킵니다.
```typescript
import 'server-only';

export async function queryDatabaseInternal() {
  // 서버에서만 실행 보장
}
```

### 2. Client Component는 리프(Leaf) 노드로 유지
- 데이터를 페칭하고 비즈니스 로직을 처리하는 최상위 페이지/레이아웃은 **Server Component**로 유지합니다.
- `onClick`, `onChange`, 상태 관리(`useState`), 브라우저 이벤트가 필요한 UI 조각(버튼, 모달 폼, 드롭다운 등)만 최소 단위로 `'use client'`를 선언합니다.

### 3. Server Actions 보안 체크
Server Actions (`'use server'`)는 공개 HTTP 엔드포인트와 동일하므로, 함수 내부에서 반드시 사용자 인증(`session`) 및 인가(`role`) 검증을 먼저 수행해야 합니다.
