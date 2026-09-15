# [DB 설계 및 개선안] 구글 시트 기반 WMS DB 한계 분석 및 Supabase(PostgreSQL) 최적화 방안

## 1. 개요 및 배경

현재 WMS 시스템은 구글 시트를 데이터베이스로 활용하여 `orderapp`(주문앱), `g-manager`(주문접수Web), `picking app`(피킹), `inventory app`(재고관리)을 연동하는 구조를 취하고 있습니다. 
기존 관리 항목(stores, Items, orders, users)을 분석한 결과, **스프레드시트 특유의 중복 기재(비정규화)와 실시간 재고 수량 추적의 부재**라는 구조적 한계가 존재합니다. 

본 문서는 이를 극복하기 위해 **필수 추가/보완 항목**과 **Supabase(PostgreSQL) 기반의 정규화 데이터베이스 설계안(DDL 포함)**을 정의합니다.

---

## 2. 기존 구글 시트 항목 분석 및 보완/추가 사항

### 2.1 기존 시트 구성
* **stores**: `No`, `ADDRESS`, `TEL`
* **Items**: `sku`, `upc`, `item volume`, `desc ko`, `koDesc`, `catagory`, `warehouse location`, `shelf`, `note`, `UOM`, `box_price`, `unit_price`
* **orders**: `ORDER_DATE`, `STORE_NAME`, `STORE_ADDRESS`, `SKU`, `ITEM_NAME`, `ITEM_KO`, `DESCRIPTION`, `ITEM_KO_DESC`, `CATEGORY`, `QTY`, `STATUS`, `PRICE`, `ORDERED_BY`, `UPDATED_BY`, `UPDATED_AT`, `PICKED_QTY`, `INVOICE_AMOUNT`, `NOTE`, `INVOICE_NUMBER`, `UOM`
* **users**: `PHONE`, `NAME`, `PASSWORD_HASH`, `ROLE`, `STATUS`, `CREATED_AT`

---

### 2.2 핵심 문제점 및 보완 사항

#### ① [치명적] `orders`의 주문 헤더와 상세 품목 미분리 (비정규화 문제)
* **현상**: 한 주문(송장)에 5개 품목이 포함될 경우, `STORE_NAME`, `STORE_ADDRESS`, `INVOICE_NUMBER`, `INVOICE_AMOUNT`가 5개 행에 똑같이 중복 기재됨.
* **문제점**:
  * 매장 주소나 송장번호 변경 시 관련 행을 모두 수정해야 하며, 누락 시 데이터 불일치 발생.
  * `INVOICE_AMOUNT`를 합산(SUM) 집계할 경우 주문 금액이 품목 수만큼 중복 집계되어 왜곡됨.
* **보완책**: **`orders`(주문 헤더 - 1건)**와 **`order_items`(주문 품목 상세 - N건)**로 1:N 정규화 분리.

#### ② [핵심 결함] 실시간 재고 수량(On-hand Qty) 관리 부재
* **현상**: `Items`에 로케이션명(`warehouse location`, `shelf`)만 기재되어 있고, 해당 로케이션에 **"실제 몇 개가 남아있는지"** 수량 필드가 없음.
* **문제점**: 주문 접수 시점에 결품 여부를 사전 판별할 수 없고, 피킹 중 재고 부족이 빈번히 발생함.
* **보완책**: 로케이션별 실물 재고와 피킹 할당량을 추적하는 **`inventory`(재고 원장)** 테이블 독립 신설.

#### ③ Cold Chain(온도 구분) 및 자동 동선 연산 필드 누락
* **현상**: 상품별 보관 온도(`상온` vs `냉동`) 구분이 없으며, `shelf`가 비정형 텍스트로 기재됨.
* **보완책**:
  * `items`: 온도 구분(`zone_type`: `'A'`/상온, `'F'`/냉동차량) 필드 추가.
  * `locations`: 2개 통로 3단 랙 S-Shape 최적 동선 자동 정렬을 위해 `zone`, `aisle`(통로), `section`(섹션), `tier`(단)으로 세분화.

#### ④ 작업자 및 감사 추적(Audit) 필드 누락
* **보완책**: 오피킹 발생 시 원인 규명 및 작업자별 성과 측정을 위해 `PICKER_ID`(작업자), `PICKED_AT`(피킹 완료 일시) 필드 추가.

---

## 3. Supabase(PostgreSQL) 최적화 DB 스키마 구조

```
[stores] ──< [orders] ──< [order_items] >── [items] >── [inventory]
                 │                                           │
             [users] (주문자/피커/관리자)                [locations]
                                                            │
                                            ┌───────────────┤
                                            │               │
                                [inventory_adjustments] [cycle_count_requests]
                                   (실사 감사 로그)        (실사 요청 큐)
```

### 테이블 구성 요약 (9개 핵심 테이블)
1. **`stores`**: 매장/고객사 기본 정보
2. **`users`**: 작업자 및 관리자 계정 (권한: ADMIN, INSPECTOR, STORE, PICKER)
3. **`locations`**: 창고 로케이션 마스터 (Zone-Aisle-Bay-Level-Bin 5단계 좌표)
4. **`items`**: 상품 마스터 (SKU, 바코드, 단가, 규격, 온도구분, 안전재고)
5. **`inventory`**: 로케이션별 실시간 재고 원장 (실재고, 할당재고, 마이너스 방지 제약)
6. **`orders`**: 주문 헤더 (송장번호, 매장, 총 청구액, 상태)
7. **`order_items`**: 주문 상세 품목 (SKU, 수량, 피킹수량, 피커, 피킹시각)
8. **`inventory_adjustments`**: 실사 보정 감사 로그 (ADR-006 — 누가/언제/왜 바꿨는지 영구 기록)
9. **`cycle_count_requests`**: 긴급/정기 실사 요청 큐 (CMD-SKIP 발생 시 자동 인서트)

---

## 4. Supabase SQL DDL (실행 스크립트)

```sql
-- =============================================================================
-- 1. 매장 및 사용자 마스터
-- =============================================================================

-- 매장 마스터
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    store_no VARCHAR(20) UNIQUE NOT NULL,      -- 매장 번호 (No)
    name VARCHAR(100) NOT NULL,                -- 매장명
    address TEXT NOT NULL,                     -- 배송지 주소
    tel VARCHAR(30),                           -- 연락처
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 사용자 마스터 (Supabase Auth 연동 또는 단독 운영 가능)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,         -- 로그인 ID 대용
    name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'PICKER',-- 'ADMIN', 'INSPECTOR', 'PICKER', 'STORE'
    -- role 허용값:
    --   'ADMIN'      : 시스템 관리자 (모든 기능 접근)
    --   'INSPECTOR'  : 재고검사자 (재고 조회/실사/이동)
    --   'PICKER'     : 피킹 작업자 (No-Click 피킹 전용)
    --   'STORE'      : 매장 담당자 (주문 조회 전용)
    status VARCHAR(20) DEFAULT 'ACTIVE',       -- 'ACTIVE', 'INACTIVE'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. 물리적 로케이션 및 상품 마스터
-- =============================================================================

-- 로케이션 마스터 (S-Shape 동선 및 Cold Chain 자동 계산용)
-- [바코드 신표준] 인간 표기: 'A01-05-B01' | 스캔 데이터: 'LOC-A0105B01'
CREATE TABLE locations (
    id VARCHAR(20) PRIMARY KEY,                -- 예: 'A01-05-B01' (Zone+Aisle+Bay+Level+Bin)
    zone VARCHAR(5) NOT NULL,                  -- 'A'(상온 Ambient), 'F'(냉동 Freeze), 'R'(대량보관 Reserve)
    aisle INT NOT NULL,                        -- 통로 번호 (1, 2 ...) — S-Shape 정렬 1차 기준
    bay INT NOT NULL,                          -- 랙 기둥(열) 번호 (1 ~ 99) — S-Shape 정렬 2차 기준
    level CHAR(1) NOT NULL,                    -- [신표준] 선반 단: 'A'(1단), 'B'(2단), 'C'(3단), 'D'(4단)
    bin INT NOT NULL DEFAULT 1,                -- 단 내 칸 번호 (칸막이 없으면 기본값 1)
    barcode VARCHAR(50) UNIQUE NOT NULL,       -- 랙 부착 스캔 바코드 (예: 'LOC-A0105B01')
    max_capacity INT,                          -- 해당 칸 최대 적재 가능 박스 수 (공간 관리용)
    is_active BOOLEAN DEFAULT TRUE,
    -- [레거시 호환] 기존 숫자 tier → level 문자 자동 매핑 지원
    CONSTRAINT chk_level CHECK (level IN ('A','B','C','D','E','F'))
);

-- 상품 마스터
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) UNIQUE NOT NULL,           -- 상품 식별 코드 (SKU)
    upc VARCHAR(50) UNIQUE NOT NULL,           -- 바코드 (UPC/EAN-13)
    name VARCHAR(100) NOT NULL,                -- 품목명 (영문)
    name_ko VARCHAR(100),                      -- 한국어 품목명 (ITEM_KO)
    desc_ko TEXT,                              -- 한국어 상세 설명
    category VARCHAR(50),                      -- 카테고리
    item_volume NUMERIC(10, 2),                -- 부피/체적 (물류 공간 계산용)
    uom VARCHAR(20) DEFAULT 'BOX',             -- 기본 출고 단위 (BOX, EA, CASE 등)
    units_per_box INT NOT NULL DEFAULT 1,      -- [추가] 박스당 낱개 수 (UOM 환산용)
    unit_price NUMERIC(12, 2) DEFAULT 0,       -- 낱개 단가
    box_price NUMERIC(12, 2) DEFAULT 0,        -- 박스 단가
    zone_type VARCHAR(5) NOT NULL DEFAULT 'A', -- [Cold Chain] 'A'(상온), 'F'(냉동차량)
    default_location_id VARCHAR(20) REFERENCES locations(id), -- 기본 적치 로케이션
    min_stock_qty INT NOT NULL DEFAULT 0,      -- [추가] 안전 재고 수량 (보충 트리거 기준)
    shelf_life_days INT,                       -- [추가] 기본 유통기한 일수 (NULL = 비관리 품목)
    image_url TEXT,                            -- [추가] 상품 이미지 URL (현장 식별용)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,   -- [추가] 단종/판매중단 시 비활성화
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. 실시간 재고 원장 (무결성 보장)
-- =============================================================================

CREATE TABLE inventory (
    location_id VARCHAR(20) REFERENCES locations(id),
    item_id UUID REFERENCES items(id),
    on_hand_qty INT NOT NULL DEFAULT 0,        -- 실제 랙에 있는 총 실물 재고
    allocated_qty INT NOT NULL DEFAULT 0,     -- 주문에 묶여 피킹 대기 중인 재고
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (location_id, item_id),
    -- [데이터 무결성 제약조건]
    CONSTRAINT chk_positive_stock CHECK (on_hand_qty >= 0),
    CONSTRAINT chk_allocated CHECK (allocated_qty >= 0 AND allocated_qty <= on_hand_qty)
);

-- =============================================================================
-- 4. 주문 및 피킹 상세 (1:N 정규화)
-- =============================================================================

-- 주문 헤더 (1개 주문 = 1개 행)
CREATE TABLE orders (
    id VARCHAR(30) PRIMARY KEY,                -- 주문번호 (예: ORD-20260908-001)
    invoice_number VARCHAR(50) UNIQUE,         -- 송장번호
    store_id INT REFERENCES stores(id),        -- 매장 정보 연결
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'RECEIVED',     -- RECEIVED(접수), ALLOCATED(피킹배정), PICKING(피킹중), PICKED(피킹완료), DISPATCHED(출고완료)
    invoice_amount NUMERIC(12, 2) DEFAULT 0,   -- 송장 총 청구액 (1회만 기록)
    ordered_by UUID REFERENCES users(id),      -- 주문자/영업사원
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 주문 품목 상세 (1개 주문 내 품목별 N개 행)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(30) REFERENCES orders(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    location_id VARCHAR(20) REFERENCES locations(id), -- 피킹 대상 로케이션
    uom VARCHAR(20) NOT NULL,
    price NUMERIC(12, 2) NOT NULL,             -- 주문 당시 단가
    qty INT NOT NULL,                          -- 주문 요청 수량
    picked_qty INT NOT NULL DEFAULT 0,         -- 실제 피킹 완료 수량
    picker_id UUID REFERENCES users(id),       -- [핵심 추가] 실제 피킹 작업자
    picked_at TIMESTAMPTZ,                     -- [핵심 추가] 피킹 완료 시각
    status VARCHAR(20) DEFAULT 'PENDING'       -- PENDING(대기), PICKED(완료), SKIPPED(재고부족)
);

-- =============================================================================
-- 5. 재고 실사 감사 로그 & 긴급 실사 요청 큐 (ADR-006 / TRD-001)
-- =============================================================================

-- 실사 보정 감사 로그 (누가/언제/왜 재고 수량을 바꿨는지 영구 기록 — 삭제 불가 원칙)
CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id VARCHAR(20) NOT NULL REFERENCES locations(id),
    item_id UUID NOT NULL REFERENCES items(id),
    previous_qty INT NOT NULL,                 -- 보정 전 전산 수량
    counted_qty  INT NOT NULL,                 -- 실사 후 확정 수량
    diff_qty     INT NOT NULL,                 -- 차이 = counted_qty - previous_qty (음수 가능)
    reason_code  VARCHAR(30) NOT NULL,         -- 반드시 선택 (미입력 시 API 거부)
    -- reason_code 허용값:
    --   'COUNT_MISMATCH' : 수량 오차 (원인 불명확)
    --   'DAMAGED'        : 상품 파손 (낙하, 충격, 찌그러짐)
    --   'LOST'           : 분실 (실물 사라짐, 원인 미파악)
    --   'FOUND'          : 재고 발견 (전산에 없던 재고가 실물로 발견, 플러스 보정)
    --   'EXPIRED'        : 유통기한 경과 (폐기 처리)
    note TEXT,                                 -- 자유 메모 (예: "상차 중 4박스 낙하 파손")
    inspector_id UUID NOT NULL REFERENCES users(id),  -- 실사 수행 INSPECTOR
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- 감사 로그는 UPDATE/DELETE 금지 (INSERT-ONLY 원칙)
    CONSTRAINT chk_reason_code CHECK (
        reason_code IN ('COUNT_MISMATCH','DAMAGED','LOST','FOUND','EXPIRED')
    )
);

-- 긴급/정기 실사 요청 큐 (피킹 중 CMD-SKIP 발생 시 자동 인서트)
CREATE TABLE cycle_count_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id VARCHAR(20) NOT NULL REFERENCES locations(id),
    item_id UUID NOT NULL REFERENCES items(id),
    priority VARCHAR(10) NOT NULL DEFAULT 'NORMAL',
    -- priority 허용값:
    --   'URGENT' : 피킹 결품(CMD-SKIP) 발생 — INSPECTOR [실사 큐] 탭 상단에 🚨 표시
    --   'NORMAL' : 정기 순환 실사 — 일반 목록에 표시
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    -- status 허용값:
    --   'PENDING'     : 실사 대기 중
    --   'IN_PROGRESS' : 실사 진행 중 (INSPECTOR가 해당 큐 항목을 열람)
    --   'COMPLETED'   : 실사 완료 (inventory_adjustments에 결과 기록됨)
    --   'CANCELLED'   : 취소 (재고 이동 등으로 실사 불필요 처리)
    reported_by UUID REFERENCES users(id),     -- CMD-SKIP을 스캔한 PICKER ID
    completed_by UUID REFERENCES users(id),    -- 실사를 완료한 INSPECTOR ID
    completed_at TIMESTAMPTZ,                  -- 실사 완료 시각
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_priority CHECK (priority IN ('URGENT','NORMAL')),
    CONSTRAINT chk_ccr_status CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED'))
);
```

---

## 5. 기존 구글 시트 대비 개선 효과 비교

| 비교 항목 | 기존 구글 시트 모델 | 제안된 Supabase(PostgreSQL) 모델 |
| :--- | :--- | :--- |
| **주문 데이터 구조** | 1개 주문에 5개 품목 포함 시 송장/매장/금액 5번 중복 기재 | `orders`(1행) + `order_items`(5행)로 분리되어 데이터 불일치 제로 |
| **재고 현황 파악** | 로케이션 텍스트만 있고 수량 필드가 없어 결품 사전 감지 불가 | `inventory` 테이블에서 로케이션별 실시간 가용재고(`on_hand - allocated`) 즉각 산출 |
| **최적 동선 계산** | shelf가 문자열이라 수동 경로 확인 | `aisle`, `bay`, `level` 숫자/문자로 S-Shape 최단 동선 쿼리 자동 정렬 |
| **Cold Chain 제어** | 냉동 여부 필드 부재 | `zone_type='F'`로 자동 분기하여 상온 피킹 100% 완료 후 냉동차량 안내 |
| **작업 추적 및 감사**| 누가 언제 피킹했는지 추적 불가 | `picker_id`, `picked_at` 기반으로 오피킹 추적 및 개인별 피킹 생산성 통계 산출 |
| **재고 보정 감사** | 수량 변경 이력 없음 — 누가 바꿨는지 불명 | `inventory_adjustments`에 보정자/사유/이전값/이후값 영구 기록 |
| **피킹 결품 연동** | 결품 발생 시 수동으로 재고 확인 요청 | `CMD-SKIP` 스캔 즉시 `cycle_count_requests`에 URGENT 큐 자동 인서트 |
| **동시성 및 속도** | 동시 수정 시 덮어쓰기 유실, 1~2초 지연 | DB 레벨 Row Lock 및 원자적 연산으로 **0.05초 이내 즉각 응답** |

---

## 6. 성능 최적화 인덱스 설계

```sql
-- =============================================================================
-- 조회 성능 보장을 위한 인덱스 (0.05초 응답 목표)
-- =============================================================================

-- [inventory] 상품 기준 재고 조회 (바코드 스캔 → 해당 상품 전체 로케이션 역추적)
CREATE INDEX idx_inventory_item ON inventory(item_id);

-- [inventory] 로케이션 기준 재고 조회 (랙 바코드 스캔 → 해당 랙 적치 상품 목록)
CREATE INDEX idx_inventory_location ON inventory(location_id);

-- [order_items] 주문별 피킹 대기 품목 조회 (피킹 러너 진입 시 즉시 로딩)
CREATE INDEX idx_order_items_order_status ON order_items(order_id, status);

-- [order_items] 피커별 작업 이력 조회 (생산성 통계용)
CREATE INDEX idx_order_items_picker ON order_items(picker_id);

-- [cycle_count_requests] 미완료 긴급 실사 큐 조회 (INSPECTOR 홈 배너)
CREATE INDEX idx_ccr_status_priority ON cycle_count_requests(status, priority)
    WHERE status = 'PENDING';

-- [inventory_adjustments] 특정 품목/로케이션 보정 이력 조회 (감사 로그)
CREATE INDEX idx_adj_item_location ON inventory_adjustments(item_id, location_id);
CREATE INDEX idx_adj_inspector ON inventory_adjustments(inspector_id);

-- [items] 바코드(UPC) 퀵 조회 (스캔 직후 즉시 상품 식별)
CREATE INDEX idx_items_upc ON items(upc);
CREATE INDEX idx_items_sku ON items(sku);

-- [locations] 바코드 퀵 조회 (랙 스캔 직후 즉시 로케이션 식별)
CREATE INDEX idx_locations_barcode ON locations(barcode);
```

---

## 7. Supabase 고급 설정 권장 사항

### 7.1 Row Level Security (RLS) 정책

```sql
-- inventory_adjustments: INSERT는 INSPECTOR/ADMIN만, SELECT는 모두 허용
ALTER TABLE inventory_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inspector_can_insert_adjustments"
    ON inventory_adjustments FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM users WHERE role IN ('INSPECTOR', 'ADMIN')
        )
    );

-- UPDATE/DELETE는 정책 없음 → 모두 차단 (INSERT-ONLY 감사 로그 보장)

-- cycle_count_requests: PICKER는 INSERT만, INSPECTOR는 UPDATE(상태변경)까지
ALTER TABLE cycle_count_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "picker_can_create_ccr"
    ON cycle_count_requests FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('PICKER', 'ADMIN'))
    );

CREATE POLICY "inspector_can_update_ccr"
    ON cycle_count_requests FOR UPDATE
    USING (
        auth.uid() IN (SELECT id FROM users WHERE role IN ('INSPECTOR', 'ADMIN'))
    );
```

### 7.2 Supabase Realtime 구독 활성화

```sql
-- INSPECTOR 화면의 [긴급 실사 큐] 배너에 CMD-SKIP 발생 즉시 실시간 푸시
ALTER TABLE cycle_count_requests REPLICA IDENTITY FULL;
-- Supabase 대시보드 > Database > Replication에서 cycle_count_requests 테이블 구독 활성화
```

클라이언트(`src/services/inventory.service.ts`)에서:

```typescript
// CMD-SKIP 발생 시 INSPECTOR 화면에 실시간 알림
supabase
  .channel('urgent-queue')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'cycle_count_requests',
      filter: 'priority=eq.URGENT' },
    (payload) => {
      // 🚨 긴급 실사 대기 배너 카운트 +1 업데이트
    }
  )
  .subscribe();
```

### 7.3 원자적 실사 보정 PostgreSQL 함수 (RPC)

```sql
-- 재고 보정 4단계를 단일 트랜잭션으로 묶는 서버사이드 함수
CREATE OR REPLACE FUNCTION adjust_inventory_stock(
    p_location_id VARCHAR,
    p_item_id UUID,
    p_counted_qty INT,
    p_reason_code VARCHAR,
    p_note TEXT,
    p_inspector_id UUID,
    p_ccr_id UUID DEFAULT NULL   -- 연결된 실사 요청 큐 ID (있을 경우)
) RETURNS JSON AS $$
DECLARE
    v_previous_qty INT;
    v_allocated_qty INT;
BEGIN
    -- Step 1: 현재 재고 조회 및 행 잠금 (Row Lock)
    SELECT on_hand_qty, allocated_qty
    INTO v_previous_qty, v_allocated_qty
    FROM inventory
    WHERE location_id = p_location_id AND item_id = p_item_id
    FOR UPDATE;

    -- Step 2: 안전 검증 (할당 재고 이하 차감 방지)
    IF p_counted_qty < v_allocated_qty THEN
        RAISE EXCEPTION 'counted_qty(%) < allocated_qty(%): 피킹 중인 재고 보호 위반',
            p_counted_qty, v_allocated_qty;
    END IF;

    -- Step 3: 재고 수량 업데이트
    UPDATE inventory
    SET on_hand_qty = p_counted_qty,
        updated_at  = NOW()
    WHERE location_id = p_location_id AND item_id = p_item_id;

    -- Step 4: 감사 로그 기록
    INSERT INTO inventory_adjustments
        (location_id, item_id, previous_qty, counted_qty, diff_qty, reason_code, note, inspector_id)
    VALUES
        (p_location_id, p_item_id, v_previous_qty, p_counted_qty,
         p_counted_qty - v_previous_qty, p_reason_code, p_note, p_inspector_id);

    -- Step 5: 실사 큐 완료 처리 (연결된 큐가 있을 경우)
    IF p_ccr_id IS NOT NULL THEN
        UPDATE cycle_count_requests
        SET status       = 'COMPLETED',
            completed_by = p_inspector_id,
            completed_at = NOW()
        WHERE id = p_ccr_id;
    END IF;

    RETURN json_build_object(
        'success', true,
        'previous_qty', v_previous_qty,
        'counted_qty', p_counted_qty,
        'diff_qty', p_counted_qty - v_previous_qty
    );
END;
$$ LANGUAGE plpgsql;
