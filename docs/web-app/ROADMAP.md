# web-app 전체 개발 로드맵 (Implementation Plan)

**프로젝트**: Glife WMS — `web-app` (사무실 관리자용 백오피스 대시보드)  
**근거 문서**: [`01_PRD.md`](file:///c:/Users/boazn/Projects/WMS/docs/web-app/01_PRD.md) · [`02_ADR.md`](file:///c:/Users/boazn/Projects/WMS/docs/web-app/02_ADR.md) · [`03_TRD.md`](file:///c:/Users/boazn/Projects/WMS/docs/web-app/03_TRD.md) · [`04_UI_GUIDE.md`](file:///c:/Users/boazn/Projects/WMS/docs/web-app/04_UI_GUIDE.md)  
**현재 상태**: Next.js 15 + TypeScript + Tailwind v4 스캐폴딩 완료, 의존성 미설치 (빈 `src/app`)

---

## 현재 스택 요약

| 구분 | 기술 | 버전 |
|---|---|---|
| 프레임워크 | Next.js (App Router, Turbopack) | 16.3.4 |
| 언어 | TypeScript | ^5 |
| 스타일링 | Tailwind CSS | ^4 |
| 백엔드 DB | Supabase (PostgreSQL + RLS) | — |
| **추가 예정** | shadcn/ui, TanStack Table, Recharts, Zustand, React Query | — |

---

## UI/UX Reference (21st.dev 컴포넌트 레퍼런스)

사무실 환경에 적합한 **밝고 모던한 백오피스(Light Mode)** 및 높은 정보 밀도를 구현하기 위해 아래의 엔터프라이즈급 UI 컴포넌트들을 참조하여 개발을 진행합니다.

1. **대시보드 레이아웃 (Dashboard with Collapsible Sidebar)**
   - **출처**: [21st.dev - @uniquesonu](https://21st.dev/@uniquesonu/components/dashboard-with-collapsible-sidebar)
   - **적용처 (Phase 1)**: `AppSidebar`, `TopHeader` 등 전체 화면 뼈대
   - **특징**: 메뉴 접기/펴기 기능, Lucide 아이콘, 미니멀하고 전문적인 LNB 구조
2. **데이터 테이블 (Data Table with Filters)**
   - **출처**: [21st.dev - @originui](https://21st.dev/@originui/components/table/data-table-with-filters-made-with-tan-stack-table)
   - **적용처 (Phase 2)**: 재고 현황(`/inventory`), 주문 현황(`/orders`), 마스터 데이터 그리드
   - **특징**: TanStack Table 기반, 상단 상태 필터링 뱃지(Badge), 가독성 높은 정렬 및 페이지네이션
3. **통계 카드 (Stat Card)**
   - **출처**: [21st.dev - @beratberkayg](https://21st.dev/@beratberkayg/components/stat-card)
   - **적용처 (Phase 3)**: 대시보드 최상단의 KPI 위젯(당일 출고 건수, 재고 부족 현황 등)
   - **특징**: 직관적인 수치 및 증감 추이 표시, 깔끔하고 얇은 테두리(Border) 기반 미니멀리즘

---

## Phase 1 — 인프라 및 UI 뼈대 구축

> 🎯 **목표**: 개발자가 바로 화면 개발을 시작할 수 있는 완전한 환경과 공통 레이아웃을 완성한다.

### 1-A. 핵심 의존성 설치

- `[x]` **shadcn/ui 초기화**: `npx shadcn@latest init` 실행 → Zinc 테마, CSS Variables 적용
- `[x]` **Supabase 클라이언트 설치**: `@supabase/supabase-js`, `@supabase/ssr`
- `[x]` **상태관리 라이브러리**: `zustand`
- `[x]` **데이터 패칭**: `@tanstack/react-query`
- `[x]` **데이터 테이블 엔진**: `@tanstack/react-table`
- `[x]` **차트 라이브러리**: `recharts`
- `[x]` **유틸리티**: `date-fns` (날짜 처리), `xlsx` (엑셀 export)

### 1-B. 프로젝트 디렉토리 구조 셋업

```
src/
├── app/
│   ├── (auth)/login/           # 로그인 페이지
│   ├── (dashboard)/            # 인증된 관리자 레이아웃 그룹
│   │   ├── layout.tsx          # LNB + 상단바 공통 레이아웃
│   │   ├── page.tsx            # 메인 대시보드 (/)
│   │   ├── inventory/          # 재고 현황
│   │   ├── orders/             # 주문 현황
│   │   ├── master/             # 마스터 데이터 관리
│   │   └── settings/           # 시스템 설정
│   ├── api/                    # Route Handlers (서버 전용 API)
│   └── layout.tsx              # Root Layout
├── components/
│   ├── ui/                     # shadcn/ui 원자 컴포넌트
│   └── features/               # 도메인 복합 컴포넌트
│       ├── dashboard/          # KPI 카드, 차트
│       ├── inventory/          # 재고 그리드, 상세 모달
│       └── master/             # 상품·로케이션 관리 폼
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # 브라우저용 Supabase 클라이언트
│   │   └── server.ts           # 서버 컴포넌트용 Supabase 클라이언트
│   └── utils.ts                # cn(), 날짜 포맷 등 공통 유틸
├── services/
│   ├── inventory.service.ts
│   ├── orders.service.ts
│   └── master.service.ts
├── hooks/
│   └── use-realtime.ts         # Supabase Realtime 구독 훅
└── types/
    └── database.ts             # Supabase 자동 생성 타입 + 확장
```

- `[x]` 위 디렉토리 구조 생성
- `[x]` `src/lib/supabase/client.ts` — 브라우저용 Supabase 클라이언트 구현
- `[x]` `src/lib/supabase/server.ts` — Server Component용 Supabase 클라이언트 구현
- `[x]` `src/types/database.ts` — Supabase CLI로 타입 자동 생성 (`npx supabase gen types typescript`)
- `[x]` `src/lib/utils.ts` — `cn()` 유틸 구현

### 1-C. 미들웨어 및 인증 가드

- `[x]` `middleware.ts` 작성 — 미인증 접근 시 `/login` 리다이렉트 (Next 16.3 맞춰 `proxy.ts`로 변경 적용 완료)
- `[x]` `PICKER`, `INSPECTOR` role → `web-app` 전체 접근 차단 (403 처리)
- `[x]` `SUPERVISOR` role → `/master/*`, `/settings/*` 접근 차단

### 1-D. 공통 레이아웃 컴포넌트

- `[x]` **`AppSidebar`** (LNB): Logo + Nav Links (Dashboard, 재고, 주문, 마스터, 설정) 구현 — shadcn `Sidebar` 컴포넌트 활용
- `[x]` **`TopHeader`**: 현재 로그인 유저명, 역할 배지(Badge), 다크모드 토글, 로그아웃 버튼
- `[x]` **`(dashboard)/layout.tsx`**: `AppSidebar` + `TopHeader` + `main` 콘텐츠 영역 조합
- `[x]` **로그인 페이지 (`/login`)**: 이메일 + 비밀번호 폼 (shadcn `Form` + `Input` 활용), Supabase Auth 연동

### 1-E. Phase 1 완료 검증 기준

- `[x]` `npm run dev` 실행 시 에러 없이 로컬 서버 정상 구동 (및 `build` 성공)
- `[x]` `/login` 접속 → 이메일/비밀번호 입력 → 로그인 성공 시 `/dashboard`로 리다이렉트 확인
- `[x]` 미로그인 상태에서 `/dashboard` 직접 접근 시 `/login`으로 리다이렉트 확인
- `[x]` LNB 및 상단바가 모든 대시보드 페이지에서 공통으로 렌더링되는 것 확인

---

## Phase 2 — 핵심 데이터 조회 기능 구현

> 🎯 **목표**: 관리자가 Supabase의 재고·주문·이력 데이터를 강력한 필터와 함께 조회·검색·분석할 수 있는 핵심 테이블 화면을 구현한다.

### 2-A. 재고 현황 조회 (`/inventory`)

- `[x]` `services/inventory.service.ts` — `getInventoryList({ page, search, zone })` 함수 구현 (Server 전용)
- `[x]` `app/api/inventory/route.ts` — 서버 사이드 API Route Handler 구현
- `[x]` **재고 현황 테이블 컴포넌트** (`features/inventory/InventoryTable.tsx`):
  - TanStack Table 기반, 컬럼: 로케이션, SKU, 상품명, 실재고, 할당재고, 가용재고, 최근 변동일
  - Sticky Header, 행 선택 체크박스 기능
- `[x]` **필터 컨트롤**: 구역(Zone) Select, 상품명/SKU 검색 Input, 날짜 범위 DatePicker
- `[x]` **Pagination 컴포넌트** (URL SearchParams 기반 서버사이드 페이지네이션)

### 2-B. 재고 변동 이력 (Audit Trail) 조회 (`/inventory/audit`)

- `[x]` `services/inventory.service.ts` — `getAuditLog({ page, dateRange, type })` 함수 구현
- `[x]` **이력 테이블 컴포넌트**: 컬럼: 변동 유형(배지), 로케이션, SKU, 변동 수량(±), 변동 전/후 수량, 담당자, 시각
- `[x]` **변동 유형 필터**: `PICKING` / `ADJUSTMENT` / `TRANSFER` / `PUT_AWAY` 복수 선택 가능

### 2-C. 주문 현황 조회 (`/orders`)

- `[x]` `services/orders.service.ts` — `getOrderList({ page, status, dateRange })` 함수 구현
- `[x]` **주문 테이블 컴포넌트**: 컬럼: 주문 ID, 매장명, 주문일, 상태(배지: PENDING/ALLOCATED/PICKING/DONE), 아이템 수, 담당 Picker
- `[x]` **주문 상세 Sheet(Drawer)**: 주문 행 클릭 시 우측에서 슬라이드, `order_items` 목록 표시

### 2-D. 엑셀 내보내기 (Export)

- `[x]` `xlsx` 라이브러리를 활용한 `exportToExcel()` 유틸 함수 구현
- `[x]` 재고 현황, 주문 현황, 이력 테이블에 각각 **"엑셀 다운로드"** 버튼 추가 (현재 필터 적용 기준으로 전체 Export)

### 2-E. Phase 2 완료 검증 기준

- `[x]` 재고 현황 테이블에서 Zone 필터, SKU 검색, 날짜 범위 필터가 정상 동작 확인
- `[x]` 1,000건 이상의 재고 데이터 조회 시 렌더링 버벅임 없음 (TanStack Virtualizer 연동 또는 서버사이드 페이지네이션으로 처리)
- `[x]` "엑셀 다운로드" 버튼 클릭 시 `.xlsx` 파일이 정상적으로 로컬에 저장됨

---

## Phase 3 — 대시보드 차트 및 실시간 알림 연동

> 🎯 **목표**: 관리자가 페이지 진입 즉시 현장 상황을 한눈에 파악할 수 있는 실시간 대시보드를 완성한다.

### 3-A. KPI 카드 섹션

- `[x]` `features/dashboard/KpiCard.tsx` 컴포넌트 구현 (shadcn `Card` 기반)
- `[x]` 당일 **출고 완료 건수** KPI 카드 (Supabase 쿼리: `orders.status === 'DONE'`)
- `[x]` 당일 **진행 중 피킹** KPI 카드 (`status === 'PICKING'`)
- `[x]` **긴급 실사 대기** KPI 카드 (`cycle_count_requests` 미완료 건수)
- `[x]` **재고 부족 알림** KPI 카드 (`inventory.available_qty < threshold`)

### 3-B. 실시간 차트 시각화

- `[x]` `features/dashboard/PickingProgressChart.tsx` — 시간대별 피킹 완료 건수 Line Chart (Recharts)
- `[x]` `features/dashboard/InventoryStatusChart.tsx` — 재고 상태(가용/할당/부족) 비율 Donut Chart
- `[x]` 차트 데이터는 Server Component에서 초기 패칭 후, Realtime 이벤트로 클라이언트 갱신

### 3-C. 실시간 알림 센터

- `[x]` `hooks/use-realtime.ts` — Supabase Realtime 채널 구독 훅 구현
  - 구독 테이블: `cycle_count_requests` (INSERT), `orders` (UPDATE)
- `[x]` **알림 토스트(Toast)**: 현장에서 `CMD-SKIP`으로 긴급 실사 요청 발생 시 우측 상단에 실시간 토스트 팝업 표시 (shadcn `Sonner` 연동)
- `[x]` **알림 센터 아이콘** (상단바 Bell 아이콘): 미확인 알림 수 배지, 클릭 시 알림 목록 Sheet 표시

### 3-D. Phase 3 완료 검증 기준

- `[x]` 대시보드 진입 시 4개의 KPI 카드가 실제 DB 값으로 렌더링됨
- `[x]` `mobile-app` 시뮬레이터(또는 직접 Supabase Insert)로 `cycle_count_requests` 레코드 추가 시, 관리자 대시보드에 5초 이내 토스트 알림이 뜨는 것 확인
- `[x]` 피킹 완료 주문이 추가될 때 Line Chart 데이터가 페이지 새로고침 없이 갱신됨

---

## Phase 4 — 마스터 데이터 관리 및 부가 기능

> 🎯 **목표**: 마스터 데이터(상품, 로케이션, 사용자)를 web-app에서 완전히 관리 가능한 CRUD 환경을 완성하고, 라벨 출력 등 현장 운영 도구를 제공한다.

### 4-A. 상품(SKU) 마스터 관리 (`/master/items`)

- `[x]` `services/master.service.ts` — `getItems()`, `createItem()`, `updateItem()`, `deleteItem()` CRUD 구현
- `[x]` **상품 테이블**: 컬럼: SKU, UPC, 상품명, 기본 로케이션, 기준 적치 수량, 등록일
- `[x]` **신규 상품 등록 Dialog**: shadcn `Dialog` + `Form` (RHF + Zod 유효성 검사)
- `[x]` **인라인 수정(Inline Edit)**: 테이블 행에서 직접 수량, 로케이션 수정 후 저장

### 4-B. 로케이션(랙) 마스터 관리 (`/master/locations`)

- `[x]` **로케이션 트리 뷰**: Zone → Aisle → Section → Tier 계층 구조를 Collapsible Tree로 표현 (테이블 형식으로 대체 완료)
- `[x]` 신규 로케이션 추가 / 비활성화 / 기본 상품 재배치 기능 CRUD 구현

### 4-C. 사용자 계정 관리 (`/settings/users`) — ADMIN 전용

- `[x]` `services/users.service.ts` — 유저 목록 조회, 역할(role) 변경, 계정 비활성화 구현
- `[x]` **유저 테이블**: 컬럼: 이름, 전화번호, 역할(배지), 상태(Active/Inactive), 최근 로그인
- `[x]` 역할 변경 Select (PICKER / INSPECTOR / SUPERVISOR / ADMIN) + 즉시 저장

### 4-D. 바코드 라벨 출력 (`/master/labels`)

- `[x]` 로케이션 또는 SKU를 선택 후 바코드 라벨 PDF 생성 (`react-pdf` 또는 `jsPDF` 활용 - 브라우저 기본 Print로 대체 구현)
- `[x]` 라벨 템플릿 미리보기 및 인쇄 버튼 제공

### 4-E. Phase 4 완료 검증 기준

- `[x]` 신규 상품 등록 → 상품 테이블에 즉시 반영 확인
- `[x]` SUPERVISOR 계정으로 로그인 후 `/settings/users` 직접 URL 접근 시 403 또는 리다이렉트 처리 확인
- `[x]` 로케이션 선택 → 라벨 PDF 생성 → 브라우저 인쇄 다이얼로그 정상 팝업 확인

---

## 공통 검증 (모든 Phase 공통 적용)

- `[x]` `powershell -ExecutionPolicy Bypass -File scripts/validate-arch.ps1` — 아키텍처 준수 검증 통과
- `[ ]` `any` 타입 미사용 — 모든 컴포넌트 및 서비스에 명시적 TypeScript 타입 적용 (일부 Supabase Type 우회용 any 존재 - 추후 타입 제너레이터 실행 시 제거 가능)
- `[x]` 모든 외부 DB 접근은 `services/` 레이어를 통해서만 수행 (Client Component에서 직접 Supabase 쿼리 금지)
- `[x]` Vercel 배포 후 프로덕션 환경에서 빌드 에러 없이 정상 동작 확인

---

## 개발 우선순위 요약

```
Phase 1 (인프라)  ──▶  Phase 2 (데이터 조회)  ──▶  Phase 3 (실시간)  ──▶  Phase 4 (마스터 관리)
  1~2일                   3~5일                      2~3일                    3~5일
```

> **총 예상 기간**: 약 2~3주 (기능 범위 및 Supabase DB 데이터 준비 상태에 따라 변동)
