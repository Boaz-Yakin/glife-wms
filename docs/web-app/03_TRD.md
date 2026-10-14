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
모바일 앱과 동일한 Auth 스키마를 사용하되, 프록시 미들웨어(`proxy.ts` / `middleware.ts`)에서 강력한 차단 정책을 적용합니다.
- `role === 'PICKER'` 또는 `role === 'INSPECTOR'`: `web-app`의 모든 경로(`/`) 접근 불가 (403 Forbidden).
- `role === 'SUPERVISOR'`: 마스터 데이터 생성/수정 라우트 접근 차단 (조회만 허용), 사용자 관리(`settings/users`) 접근 차단.
- API Route에서도 `auth.getUser()` 검증을 통해 관리자 권한 확인 후 DB 트랜잭션 수행.

### 4.1 무과금 2단계 인증: Google OTP (TOTP)
- **비용 0원 MFA**: 통신사 SMS 과금 없이 스마트폰 Google Authenticator / MS Authenticator 앱을 이용한 시간 기반 일회용 비밀번호(TOTP) 사용.
- **인증 보증 레벨 (AAL - Authenticator Assurance Level)**:
  - 1단계: 전화번호(가상 이메일 `${cleanPhone}@glife.com`) + 비밀번호 로그인 (`AAL1`).
  - 2단계: TOTP Factor가 등록된 계정은 Supabase Auth의 `aal2` 챌린지 수행. 미들웨어에서 `currentLevel === 'aal1' && nextLevel === 'aal2'`인 경우 대시보드 진입을 차단하고 OTP 검증 완료 유도.
- **Factor 관리 UI (`/settings/security`)**:
  - `supabase.auth.mfa.enroll({ factorType: 'totp' })`로 SVG QR 코드 및 Base32 Secret Key 발급.
  - 6자리 인증코드 검증 완료 시 Factor를 활성화(`verified`). 언제든지 해제(`unenroll`) 가능.

## 5. Master Data - Stores Management (매장 마스터 관리)
### 5.1 데이터 모델 및 스키마 확장 (`public.stores`)
- `client_id` (UUID, FK to `public.clients.id`, ON DELETE CASCADE): 화주사 1:N 관계
- `is_active` (BOOLEAN, 기본값 `true`): 소프트 딜리트 및 발주 가능 상태 제어
- `store_no` (VARCHAR(50)): 클라이언트별 매장 고유 코드 (`UNIQUE(client_id, store_no)`)
- `contact_person` (VARCHAR(100)): 매장 담당자명
- `phone` (VARCHAR(50)): 매장 연락처
- `note` (TEXT): 배송 시 주의사항 및 비고

### 5.2 CRUD & 데이터 무결성 정책
- **열람**: 상단 글로벌 `ClientSwitcher`와 자동 연동되어 선택된 화주사 매장만 필터링하거나, 'All Clients' 상태에서는 전체 매장 및 소속 화주사 뱃지 노출.
- **등록/수정**: Server Action (`createStoreAction`, `updateStoreAction`)을 통해 처리되며 `(client_id, store_no)` 중복 에러 핸들링.
- **삭제/비활성화**: `orders` 테이블과의 무결성 제약으로 인해 이미 주문 이력이 존재하는 매장은 삭제 차단 후 비활성화(`is_active = false`) 유도. 미사용 매장은 영구 삭제 지원.

## 6. Order Management - Order Details Editing (주문 상세 편집 및 품목 관리)
### 6.1 요구사항 및 기능 범위
- **Order Header**: `order_date` (주문 일시) 수정 기능 제공.
- **Order Items (품목 라인)**:
  - `UOM` (단위: EA, BOX, PACK 등) 변경 시 해당 마스터 단가 자동 제안 및 수동 오버라이드 지원.
  - `unit_price` (단가) 및 `qty` (발주 수량) 실시간 수정.
  - 실시간 행별 `Subtotal` 및 상위 `Total Amount`, `Total Units` 자동 재계산.
  - 기존 품목 행 삭제(Trash) 기능.
  - 신규 품목 추가(Add Item) 기능: 상품 마스터 검색 드롭다운 연동하여 `item_id`, `uom`, `price`, `qty` 등록.
### 6.2 데이터 정합성 및 트랜잭션 정책
- Server Action (`updateOrderAction`) 및 `orders.service.ts`를 통해 서버 단에서 원자적 갱신:
  - 삭제 대상 `order_items` DELETE
  - 수정 대상 `order_items` UPDATE (`qty`, `uom`, `price`, `invoice_amount`)
  - 신규 추가 `order_items` INSERT (`order_id`, `item_id`, `qty`, `uom`, `price`, `is_taxable`)
  - `orders` 테이블의 `order_date`, `invoice_amount`, `updated_at` 갱신
  - `revalidatePath('/orders')` 및 `revalidatePath('/dashboard')` 수행