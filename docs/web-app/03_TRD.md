# TRD: web-app 기술 요구사항 (Technical Requirements Document)
<!-- 작성일: 2026-09-14 | 프로젝트: web-app (사무실 관리자용 백오피스 대시보드) -->

## 1. System Architecture (시스템 아키텍처)
`web-app`은 Next.js 15 App Router 환경에서 동작하며, 모든 데이터베이스 트랜잭션은 Supabase PostgreSQL(공통 인프라)을 사용합니다.
보안 및 성능 확보를 위해 외부 API 호출이나 무거운 데이터 쿼리는 Server Component 및 Route Handlers (`/app/api/...`)에서 수행합니다.

### 1.1 Directory Structure
```
src/
├── app/               # 대시보드, 마스터 관리, 설정 등의 페이지 라우트
├── components/        # UI 컴포넌트
│   ├── ui/            # shadcn/ui 기반 원자 단위 컴포넌트 (Button, Table 등)
│   └── features/      # 특정 도메인 로직이 결합된 복합 컴포넌트 (대시보드 차트, 재고 그리드)
├── lib/               # utils, supabase client 연동
├── services/          # Supabase DB 접근 및 비즈니스 로직 캡슐화 레이어
└── types/             # TypeScript 인터페이스 (Supabase 생성 타입 확장)
```

## 2. State Management (상태 관리 로직)
백오피스의 특성 상 검색 조건(날짜, 키워드, 카테고리) 및 페이징 상태가 빈번하게 변동합니다.
- **URL Search Params**: 공유 가능한 상태(현재 페이지, 필터 값 등)는 `next/navigation`의 `useSearchParams`를 활용하여 URL 쿼리 파라미터와 동기화합니다.
- **Client Global State**: UI 단의 일시적인 상태(모달 열림/닫힘, 다중 선택된 행 리스트)는 `Zustand`로 관리합니다.

## 3. API & Data Fetching (데이터 통신)
- **Supabase SDK 연동**: `supabase-js` 클라이언트를 사용하여 데이터베이스에 직결. Role-Level Security(RLS) 정책에 의해 `ADMIN`, `SUPERVISOR` 권한만 통과합니다.
- **Realtime Subscription**: `/dashboard` 진입 시 `orders` 및 `inventory_adjustments` 테이블의 INSERT/UPDATE 이벤트를 구독하여 실시간 배너 갱신 및 차트 리렌더링을 유도합니다.

## 4. Security & Role-Based Access (보안 및 권한 제어)
모바일 앱과 동일한 Auth 스키마를 사용하되, 미들웨어(`middleware.ts`)에서 강력한 차단 정책을 적용합니다.
- `role === 'PICKER'` 또는 `role === 'INSPECTOR'`: `web-app`의 모든 경로(`/`) 접근 불가 (403 Forbidden).
- `role === 'SUPERVISOR'`: 마스터 데이터 생성/수정 라우트 접근 차단 (조회만 허용).
- API Route에서도 `auth.getUser()` 검증을 통해 관리자 권한 확인 후 DB 트랜잭션 수행.