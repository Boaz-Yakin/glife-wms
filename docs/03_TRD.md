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
        "name": "Fresh Apple 1kg",
        "nameKo": "신선 사과 1kg",
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
