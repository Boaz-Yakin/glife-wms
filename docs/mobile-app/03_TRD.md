# Technical Requirements Document (TRD)
<!-- TRD: "특정 기능/모듈을 어떻게 구현할 것인가?" -->
<!-- Design-First 원칙: 코드 작성 전에 명세를 확정하고, 구현 완료 후 Status를 업데이트한다 -->

# TRD-001: 현장 재고 조사(Inspection) 및 실사(Cycle Count) 모듈

**Status**: `In Progress`  
**작성일**: 2026-09-08  
**작성자**: Core Team  
**관련 PRD 기능**: [F-07, F-08, F-09](01_PRD.md#42-재고검사자-inspector-전용-모듈-inventory)  
**관련 ADR**: [ADR-001](02_ADR.md#adr-001-nextjs-15-app-router-기반-라우트-그룹-picking--inventory-분리), [ADR-002](02_ADR.md#adr-002-역할-기반-라우팅-및-보안-제어-role-based-access-control), [ADR-006](02_ADR.md#adr-006-재고-실사조정-트랜잭션-무결성-및-감사-로그audit-trail-보장), [ADR-007](02_ADR.md#adr-007-현장-모바일-최적화-ux-thumb-zone--인라인-넘버패드)

---

## 1. Overview (개요)

창고 현장 재고검사자(`INSPECTOR`)가 스마트폰이나 모바일 PDA를 사용하여 **로케이션 및 상품 바코드를 스캔하여 실시간 재고를 즉시 조회**하고, 전산 재고와 실물 재고의 오차를 확인하여 **단일 트랜잭션으로 안전하게 수량을 보정(Cycle Count & Adjustment)**하며, **로케이션 간 재고 이동(Bin-to-Bin Transfer)**을 수행하는 핵심 모듈입니다.

---

## 2. Database Schema & Models (데이터 모델)

### 2.1 테이블 정의 (Supabase PostgreSQL)

```sql
-- 1. 재고 실사/조정 감사 로그 테이블 (신설)
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id VARCHAR(20) NOT NULL REFERENCES locations(id), -- 예: 'A01-05-B01'
    item_id UUID NOT NULL REFERENCES items(id),
    previous_qty INT NOT NULL,                 -- 조정 전 전산 수량
    counted_qty INT NOT NULL,                  -- 실사 수량 (조정 후 수량)
    diff_qty INT NOT NULL,                     -- 차이 (counted_qty - previous_qty)
    reason_code VARCHAR(30) NOT NULL,          -- 'COUNT_MISMATCH', 'DAMAGED', 'LOST', 'FOUND', 'EXPIRED'
    note TEXT,
    inspector_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 실사 요청 큐 (피킹 중 CMD-SKIP 발생 시 자동 인서트)
CREATE TABLE cycle_count_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id VARCHAR(20) NOT NULL REFERENCES locations(id), -- 예: 'A01-05-B01'
    item_id UUID NOT NULL REFERENCES items(id),
    priority VARCHAR(10) DEFAULT 'NORMAL',     -- 'URGENT'(피킹결품), 'NORMAL'(정기실사)
    status VARCHAR(20) DEFAULT 'PENDING',      -- 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'
    reported_by UUID REFERENCES users(id),     -- 신고한 피커 ID
    completed_by UUID REFERENCES users(id),    -- 완료한 INSPECTOR ID
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. API Interfaces (API 라우트 & 서비스 명세)

모든 API는 Next.js App Router Route Handler (`src/app/api/inventory/*`)를 통해 노출되며, 실제 DB 처리는 `src/services/inventory.service.ts`에서 수행합니다. (아키텍처 규칙: 클라이언트 컴포넌트에서 직접 Supabase 호출 금지)

### 3.1 API Endpoints

#### ① 바코드 퀵 조회 (GET `/api/inventory/lookup`)
- **Query Params**:
  - `type`: `'location'` | `'item'`
  - `code`: 바코드 스트링 (로케이션 바코드 또는 UPC/SKU 바코드)
- **Response Success (200)**:
  ```json
  // type=location인 경우
  {
    "success": true,
    "location": {
      "id": "A01-05-B01",
      "zone": "A",
      "aisle": 1,
      "bay": 5,
      "level": "B",
      "bin": 1,
      "barcode": "LOC-A0105B01"
    },
    "items": [
      {
        "itemId": "uuid-111",
        "sku": "SKU-APPLE-01",
        "upc": "8801234567890",
        "name_en": "Fresh Apple 1kg",
        "name_kr": "신선 사과 1kg",
        "onHandQty": 24,
        "allocatedQty": 4,
        "availableQty": 20,
        "uom": "BOX",
        "zoneType": "A"
      }
    ]
  }
  ```

#### ② 실사 보정 확정 (POST `/api/inventory/adjust`)
- **Request Body**:
  ```json
  {
    "locationId": "A-01-05-2",
    "itemId": "uuid-111",
    "countedQty": 20,
    "reasonCode": "COUNT_MISMATCH",
    "note": "박스 파손 4개 제외 실사 완료",
    "requestId": "uuid-request-opt" // cycle_count_requests ID (선택)
  }
  ```
- **Response Success (200)**:
  ```json
  {
    "success": true,
    "adjusted": {
      "locationId": "A01-05-B01",
      "itemId": "uuid-111",
      "previousQty": 24,
      "countedQty": 20,
      "diffQty": -4,
      "updatedAt": "2026-09-08T13:40:00Z"
    }
  }
  ```

#### ③ 로케이션 간 이동 (POST `/api/inventory/transfer`)
- **Request Body**:
  ```json
  {
    "fromLocationId": "A-01-05-2",
    "toLocationId": "A-01-08-1",
    "itemId": "uuid-111",
    "qty": 5
  }
  ```

#### ④ 실사 큐 조회 (GET `/api/inventory/queue`)
- 피킹 결품(`CMD-SKIP`)으로 인입된 `URGENT` 건 우선 정렬 목록 반환.
- 쏼리 파라미터: `?status=PENDING` (default), `?priority=URGENT`

---

### 3.2 Service Layer Signature (`src/services/inventory.service.ts`)

```typescript
export interface LocationInventoryResult {
  location: LocationDto;
  items: InventoryItemDto[];
}

export interface AdjustStockParams {
  locationId: string;
  itemId: string;
  countedQty: number;
  reasonCode: 'COUNT_MISMATCH' | 'DAMAGED' | 'LOST' | 'FOUND' | 'EXPIRED';
  note?: string;
  inspectorId: string;
  requestId?: string;
}

export interface TransferStockParams {
  fromLocationId: string;
  toLocationId: string;
  itemId: string;
  qty: number;
  operatorId: string;
}

// 1. 로케이션 바코드 조회
export async function lookupByLocation(barcode: string): Promise<LocationInventoryResult>;

// 2. 상품 바코드/SKU 조회
export async function lookupByItem(barcodeOrSku: string): Promise<ItemLocationsResult>;

// 3. 재고 보정 (PostgreSQL 원자적 트랜잭션: inventory UPDATE + adjustments INSERT)
export async function adjustInventoryStock(params: AdjustStockParams): Promise<AdjustmentRecordDto>;

// 4. 로케이션 이동 (From 차감 + To 증가 원자적 트랜잭션)
export async function transferInventoryStock(params: TransferStockParams): Promise<TransferRecordDto>;

// 5. 실사 큐 조회
export async function getPendingCycleCountQueue(): Promise<CycleCountTaskDto[]>;
```

---

## 4. Security & Role Authorization (보안 및 권한 정책)

1. **역할(Role) 검증**:
   - `adjustInventoryStock` 및 `transferInventoryStock`은 반드시 세션 유저의 role이 `INSPECTOR` 또는 `ADMIN`이어야만 수행 가능.
   - `PICKER` 권한 사용자가 해당 API를 호출할 경우 `403 Forbidden` 반환.
2. **트랜잭션 롤백 원칙**:
   - 보정 후 결과 수량이 음수(`countedQty < 0`)이거나, 현재 피킹 할당량(`allocated_qty`)보다 작게 보정하려 할 경우(`countedQty < allocated_qty`) `400 Bad Request ("Cannot adjust below allocated quantity")` 에러 반환 및 롤백.

---

## 5. UI/UX Interface Design (현장 모바일 화면 설계)

### 5.1 라우트 구조 (`src/app/(inventory)/...`)
- `/inventory`: 현장 재고 메인 대시보드 (긴급 실사 알림 배너, 탭 1)
- `/inventory/lookup`: 한 손 조작 퀵 바코드 뷰어 (스캐너 + 로케이션/상품 상세 카드, 탭 2)
- `/inventory/queue`: 실사 큐 (긴급 URGENT / 정기 NORMAL 대기 목록, 탭 3)
- `/inventory/count`: 실사(Cycle Count) 실행 화면 (전산 vs 실물 카운터, 인라인 넘버패드, 원터치 일치 확인)
- `/inventory/transfer`: 로케이션 간 재고 이동 마법사 (출발지 ➔ 품목 ➔ 수량 ➔ 도착지, 탭 4)

### 5.2 화면별 UI 컴포넌트 사양
1. **상단 퀵 바코드 상태바**:
   - 링스캐너 연결 여부 아이콘(Bluetooth Online/Offline 뱃지).
   - "스캔 대기중..." 실시간 펄스 애니메이션.
2. **원터치 전산 일치(Match) 버튼**:
   - 실물 수량이 전산 수량과 완벽히 같을 경우, 숫자를 입력할 필요 없이 `[전산 수량과 일치 (One-Tap)]` 녹색 버튼을 탭하면 즉시 검수 완료 처리.
3. **인라인 대형 증감 패드**:
   - 모바일 키보드가 화면을 가리는 현상을 원천 방지하기 위해 화면 하단에 `[-10]`, `[-1]`, `[+1]`, `[+10]` 대형 버튼 및 숫자 다이얼로그 제공.
4. **시각적 경고 색상 피드백**:
   - 전산 수량 일치: 에메랄드 그린 (`#10B981`)
   - 실물 부족(Shortage): 앰버 오렌지 (`#F59E0B`)
   - 실물 초과/파손: 로즈 레드 (`#EF4444`)

---
---

# TRD-002: 작업자 인증 & 역할 기반 접근 제어 (Auth & RBAC)

**Status**: `Completed`  
**작성일**: 2026-10-22  
**결정 방식**: `/grill-me` 설계 인터뷰 (Q1~Q11)  
**관련 PRD 기능**: [F-11, F-12](01_PRD.md#43-공통-기반-모듈-common--infrastructure)  
**관련 ADR**: [ADR-002](02_ADR.md#adr-002-역할-기반-라우팅-및-보안-제어-role-based-access-control)

## 1. 배경 (현재 문제)
- `/api/inventory/adjust` 등 쓰기 API에 인증이 없음 → 누구나 재고 변경 가능.
- `count/page.tsx`가 `userId: 'USR-TEST-1'` 하드코딩 → 감사 로그(`inspector_id`) 무의미.
- `/login`, 라우트 가드, `auth.service.ts` 부재.

## 2. 설계 결정 요약

| # | 항목 | 결정 |
|---|---|---|
| Q1 | 로그인 방식 | 전화번호 + PIN, web-app과 **동일 Supabase Auth 계정 공유** (가상 이메일 `{phone}@glife.com`), OTP 생략 |
| Q5 | PIN 규격 | **숫자 6자리 고정** (Supabase 최소 6자 정책 유지) |
| Q2 | 단말/세션 | 개인 폰 → **30일 장기 세션**, 수동 로그아웃만 |
| Q3 | 계정 관리 | web-app `Settings > Users`에서 생성 (role 지정, PIN 초기화) |
| Q4 | ADMIN 진입 | 로그인 후 **모드 선택 화면**(피킹/재고검사), 상단에서 언제든 전환 |
| Q6 | 앱 간 경계 | `PICKER`/`INSPECTOR`는 **web-app 로그인 차단**. ADMIN은 mobile-app에서도 기존 비밀번호 사용 |
| Q7 | 비활성 계정 | **모든 API 요청마다** `public.users.status = 'ACTIVE'` 확인 → 즉시 차단 |
| Q8 | 무차별 대입 방어 | **5회 연속 실패 시 15분 잠금** (서버 측 카운터) |
| Q9 | 오프라인 큐 | 스캔 시점 `userId`를 큐에 저장, 재연결 시 **현재 세션 사용자와 같을 때만 전송** (다르면 보류 + 경고) |
| Q10 | PIN 분실/잠금 | ADMIN이 web-app에서 **임시 PIN 발급** → 첫 로그인 시 **새 PIN 강제 변경** |
| Q11 | 작업자 ID 출처 | 요청 본문 `userId` **무시**, 항상 서버 세션에서 추출 |

## 3. 데이터 모델 변경

```sql
-- 1) PIN 강제 변경 플래그
ALTER TABLE public.users ADD COLUMN must_change_pin BOOLEAN NOT NULL DEFAULT false;

-- 2) 로그인 실패 카운터 (service_role 전용, RLS: 일반 사용자 접근 불가)
CREATE TABLE public.auth_login_attempts (
    phone         VARCHAR(20) PRIMARY KEY,
    failed_count  INT NOT NULL DEFAULT 0,
    locked_until  TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY; -- 정책 없음 = service_role만 접근
```

## 4. 구현 구조 (Next.js 16)

> [!IMPORTANT]
> Next.js 16에서 `middleware.ts`는 **`proxy.ts`**로 변경됨 (`node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`). 쿠키 기반 세션을 위해 `@supabase/ssr` 의존성을 추가한다.

| 파일 | 역할 |
|---|---|
| `src/proxy.ts` | 세션 갱신 + 라우트 가드 (미로그인 → `/login`, `must_change_pin` → `/login/change-pin`, PICKER의 `/inventory/*` → `/picking/run`, INSPECTOR의 `/picking/*` → `/inventory`, ADMIN 최초 → `/mode`) |
| `src/lib/supabase/server.ts` / `client.ts` | `@supabase/ssr` 서버/브라우저 클라이언트 |
| `src/services/auth.service.ts` | `requireWorker(allowedRoles)`: 세션 + `users.status/role` 확인 후 `{ userId, role }` 반환. 실패 시 401/403 |
| `src/app/api/auth/login/route.ts` | 잠금 확인 → `signInWithPassword` → 실패 시 카운터 증가 / 성공 시 초기화 |
| `src/app/login/page.tsx` | 전화번호 + 6자리 숫자 키패드 (장갑 대응 대형 버튼) |
| `src/app/login/change-pin/page.tsx` | 새 PIN 2회 입력 → `updateUser({ password })` + `must_change_pin=false` |
| `src/app/mode/page.tsx` | ADMIN 전용 모드 선택 |

### 4.1 API 권한 매트릭스

| API | 허용 역할 |
|---|---|
| `POST /api/inventory/adjust`, `/transfer` | `INSPECTOR`, `ADMIN` |
| `GET /api/inventory/queue`, `/lookup` | `INSPECTOR`, `ADMIN` (`PICKER` 조회 허용 여부는 추후) |
| `GET/POST /api/picking/*` (`orders`, `run`, `skip`) | `PICKER`, `ADMIN` |

### 4.2 에러 응답
- `401 UNAUTHENTICATED`: 세션 없음/만료 → 클라이언트는 `/login`으로 이동
- `403 FORBIDDEN_ROLE` / `403 ACCOUNT_INACTIVE`
- `423 LOCKED`: `{ lockedUntil }` 반환, 로그인 화면에 남은 시간 표시

## 5. web-app 측 변경 (범위 포함)
- 로그인 후 role이 `PICKER`/`INSPECTOR`이면 로그아웃 + "현장 앱을 사용하세요" 안내.
- `Settings > Users`: 6자리 숫자 PIN 검증, **임시 PIN 발급** 액션(`must_change_pin=true` 설정, 잠금 카운터 초기화).

## 6. 수용 기준 (QA)
1. 미로그인 상태에서 `/inventory`, `/picking/run` 접근 시 `/login`으로 이동.
2. PICKER 토큰으로 `POST /api/inventory/adjust` → 403.
3. 비활성화된 사용자의 기존 세션으로 API 호출 → 403 `ACCOUNT_INACTIVE`.
4. PIN 5회 실패 → 423, 15분 후 해제.
5. `inventory_adjustments.inspector_id`가 실제 로그인 사용자로 기록 (본문 `userId` 위조 무시).
6. 오프라인 큐: 다른 사용자로 재로그인 시 기존 큐 전송 보류 + 경고 표시.

---

# TRD-003: 간이 입고 적치 및 초기 재고 설정 (Put-away & Initial Stock In)

**Status**: `Approved`  
**작성일**: 2026-10-22  
**관련 PRD 기능**: [F-10 간이 입고 적치](01_PRD.md#42-재고검사자-inspector-전용-모듈-inventory)  
**관련 ADR**: [ADR-001, ADR-002, ADR-006, ADR-007](02_ADR.md)

## 1. 개요 (Overview)
창고 오픈 초기 또는 신규 상품 입고 시, 현장 작업자(`INSPECTOR`, `ADMIN`)가 빈 랙이나 기존 보관 랙에 서서 **로케이션 바코드/QR과 상품 바코드를 스캔하고 수량을 입력하여 즉시 전산 재고를 생성/증대(Put-away & Stock In)**하는 현장 전용 모듈입니다.

## 2. 사용자 플로우 (Workflow)
```
[1. 로케이션 스캔] ➔ [2. 상품 바코드 스캔] ➔ [3. 적치 수량 입력] ➔ [4. 적치 확정 및 DB 저장]
```
- **Step 1 (로케이션 스캔)**: 목표 선반 랙의 2D QR 또는 바코드(`LOC-...`) 스캔 (유효한 위치인지 검증, `/lookup` 화면에서 빈 랙 발견 시 1클릭 프리셋 진입 지원)
- **Step 2 (상품 스캔)**: 적치할 상품의 UPC/EAN 바코드 또는 `SKU-...` 스캔 (마스터 품목명, 규격 자동 매핑)
- **Step 3 (수량 입력)**: 인라인 넘버패드 및 퀵 증감 버튼(`+1`, `+10`, `+50`)으로 현장 실물 수량 입력
- **Step 4 (확정 및 반영)**: 원자적 API 호출 ➔ `inventory` 레코드 신규 생성(`INSERT`) 또는 기존 수량 가산(`UPDATE`), `inventory_adjustments`에 작업자 ID와 사유(`INITIAL_STOCK_IN` 또는 `PUT_AWAY`) 감사 로그 기록

## 3. API 명세 (API Specification)

### `POST /api/inventory/put-away`
- **보안**: `requireWorker(INSPECTOR_ROLES)` 세션 검증 (작업자 ID는 세션에서 추출)
- **Request Body**:
  ```json
  {
    "locationCode": "LOC-A0101A01",
    "itemCode": "8801234567890",
    "qty": 50,
    "reason": "INITIAL_STOCK_IN"
  }
  ```
- **Response Success (200)**:
  ```json
  {
    "success": true,
    "inventory": {
      "inventoryId": "uuid-...",
      "locationCode": "A01-01-A01",
      "sku": "SKU-APPLE-01",
      "name": "Fresh Apple 1kg",
      "previousQty": 0,
      "newQty": 50,
      "allocatedQty": 0
    }
  }
  ```
- **Response Error (400/404/500)**:
  - 400: 필수 값 누락 또는 유효하지 않은 수량 (`qty <= 0`)
  - 404: 유효하지 않은 로케이션 또는 미등록 상품
  - 401/403: 권한 없음

## 4. UI 명세
- **진입점**:
  1. `/inventory` 홈 화면 내 [Put-away (신규 입고 적치)] 메인 액션 카드
  2. `/inventory/lookup`에서 로케이션 스캔 후 빈 랙(Empty Bin) 상태일 때 노출되는 [+ Put Away Items Here] 원클릭 버튼
- **화면 구조** (`/inventory/put-away`):
  - 상단 진행 인디케이터 (1. Location ➔ 2. Item ➔ 3. Quantity)
  - 스캔 성공 시 도-미 화음 및 진동 피드백
  - 장갑 착용 대응 56px 대형 넘버패드 및 즉시 확정 버튼

