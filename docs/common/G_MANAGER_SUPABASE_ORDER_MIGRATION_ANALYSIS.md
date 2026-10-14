# G-Manager 주문 연동 체계의 Supabase 전환 타당성 및 구현 가이드

> [!NOTE]
> 원본 문서 위치: [G-manager/docs/SUPABASE_ORDER_MIGRATION_ANALYSIS.md](file:///c:/Users/boazn/Projects/G-manager/docs/SUPABASE_ORDER_MIGRATION_ANALYSIS.md)

**문서 작성일:** 2026-10-13  
**대상 시스템:** G-manager, OrderAPP, WMS (Supabase)  
**상태:** 검토 완료 / 마이그레이션 가이드 확정  

---

## 1. 개요 및 목적

현재 **G-manager**는 구글 스프레드시트(`Orders`, `items` 탭)를 데이터 소스로 사용하여 다음 핵심 업무를 수행하고 있습니다:
1. **주문 카드 대시보드 표시**: 접수된 주문 모니터링, 검색, 필터링, 주문 상태 변경
2. **Pick Ticket 생성 및 동기화**: 창고 로케이션 순 정렬, 실제 피킹 수량(`pickedQty`) 입력, 현장 수기 품목 추가, 동기화(`Sync & Invoice`)
3. **Invoice 발행 및 채번**: 일자별/카테고리별 인보이스 번호 채번 및 보존, 인보이스 일자 지정, 인쇄 서식 출력

본 문서는 주문 데이터의 소스를 **Google Sheets에서 Supabase로 전환**할 때, **G-manager의 모든 기능이 100% 동일하게 동작할 수 있는지에 대한 기술적 타당성 분석 결과와 구체적인 구현 가이드**를 기록합니다.

---

## 2. 결론 요약 (Executive Summary)

> **"현재 Supabase 스키마 그대로는 불가능하지만, 4가지 핵심 컬럼 및 ENUM을 추가하는 마이그레이션을 거치면 100% 동일한 기능 수행이 가능하며, 오히려 처리 속도(2~4초 ➔ 0.1초)와 안정성이 대폭 개선됩니다."**

- **현재 장애 요소:**
  - Supabase `order_items`에 피킹 수량(`picked_qty`), 인보이스 금액(`invoice_amount`) 부재
  - Supabase `orders`에 인보이스 번호(`invoice_number`), 인보이스 일자(`invoice_date`) 부재
  - 주문 상태 ENUM 불일치 (`INVOICED`, `PACKED`, `SHIPPED` 미정의)
  - 현장 수기 품목 추가 시 `item_id NOT NULL` 및 외래키 제약조건 위반 가능성
  - `items` 테이블에서 한글 상품 정보(`name_kr`, `desc_kr`)가 마이그레이션으로 제거된 상태
- **해결 방안:**
  - Supabase DB 스키마 보완 (간단한 ALTER TABLE 스크립트 적용)
  - G-manager 백엔드 API(`/api/orders`)를 Supabase Client 쿼리로 재작성
  - 행 식별자 체계를 구글 시트의 `rowIndex`에서 고유 `UUID`로 전환

---

## 3. 기능별 상세 비교 및 GAP 분석

| 기능 영역 | 현재 Google Sheets 방식 | 현재 Supabase 상태 | GAP 및 해결 요구사항 |
| :--- | :--- | :--- | :--- |
| **1. 주문 목록 및 그룹핑** | 시트의 평면 행(Row)들을 타임스탬프+매장명(`groupId`)으로 묶어 카드화 | `orders`(헤더)와 `order_items`(상세)가 이미 1:N 관계로 정규화됨 | **우수:** Supabase 구조가 훨씬 적합. 복잡한 클라이언트 그룹핑 로직 불필요. |
| **2. 피킹 수량 입력 (`pickedQty`)** | 시트의 `PICKED_QTY` 열에 숫자 기록 | `order_items`에 피킹 수량 컬럼 없음 | **필수:** `order_items.picked_qty` INT 컬럼 추가 필요. |
| **3. 인보이스 번호 채번 및 보존** | 일자 기반(YYMMDD001~) 채번 후 시트 `INVOICE_NUMBER` 열 및 Redis에 영구 보존 | `orders` 또는 `order_items`에 인보이스 번호 컬럼 없음 | **필수:** `orders.invoice_number` (또는 카테고리별 분리 시 JSONB/별도 컬럼) 추가 필요. |
| **4. 인보이스 일자 (`invoiceDate`)** | 인보이스 모달에서 일자 지정 후 시트 `INVOICE_DATE` 열에 기록 | `orders.order_date`만 존재, 별도 발행일 컬럼 없음 | **필수:** `orders.invoice_date` DATE 컬럼 추가 필요. |
| **5. 주문 상태 관리 (`status`)** | `PENDING`, `PICKING`, `PACKED`, `INVOICED`, `SHIPPED`, `CANCELLED` | ENUM: `PENDING`, `RECEIVED`, `ALLOCATED`, `PICKING`, `PICKED`, `DISPATCHED`, `CANCELED` | **필수:** ENUM에 `INVOICED`, `PACKED`, `SHIPPED` 추가 또는 상태 표준화. |
| **6. 현장 수기 품목 추가 (Custom Items)** | SKU가 없어도 품목명/단가/수량으로 시트에 새 행 삽입 | `order_items.item_id UUID NOT NULL REFERENCES items(id)` 제약 존재 | **필수:** `order_items.item_id`를 Nullable로 변경하고 `custom_item_name` 컬럼을 추가하거나, 미등록 임시 SKU 마스터 레코드 지원 필요. |
| **7. 창고 로케이션 매핑** | `items` 시트에 `zone, aisle, bay, level, bin, shelf` 평면 기재 | `items` ➔ `inventory` ➔ `locations` 관계형 테이블로 분리됨 | **조회 변경:** 단일 Join 쿼리(또는 `items_with_pricing` 뷰 확장)로 품목별 기본 로케이션 매핑 구현. |
| **8. 한글 품목명 표기** | `itemKo`, `itemKoDesc` 열 직접 참조 | 마이그레이션 `20261010151000`에서 `name_kr`, `desc_kr` 삭제됨 | **검토 필요:** 피킹 작업자의 가독성을 위해 한글명 컬럼 복구 또는 대체 다국어 체계 필요. |
| **9. 식별자 체계** | 물리적 행 번호(`rowIndex: number`)로 데이터 갱신 | 고유 레코드 식별자(`UUID`) | **프론트엔드 연동:** `rowIndex` 대신 `order.id`, `item.id` (UUID)를 전달하도록 API/컴포넌트 리팩토링. |

---

## 4. 단계별 마이그레이션 실행 계획

### Phase 1. Supabase 스키마 보완 (Migration SQL)

```sql
-- =====================================================================
-- Migration: Add G-Manager Picking & Invoicing Support
-- =====================================================================

-- 1. order_status ENUM 값 확장 (INVOICED, PACKED, SHIPPED)
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'PACKED';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'INVOICED';
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'SHIPPED';

-- 2. orders 테이블에 인보이스 정보 확장
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS category_invoices JSONB DEFAULT '{}'::jsonb, -- 카테고리별 인보이스 번호 저장용
ADD COLUMN IF NOT EXISTS invoice_date DATE;

-- 3. order_items 테이블에 피킹 결과 및 수기 품목 컬럼 추가
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS picked_qty INT,
ADD COLUMN IF NOT EXISTS invoice_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS custom_item_name VARCHAR(255);

-- 4. 현장 수기 품목 허용을 위한 제약조건 완화
ALTER TABLE public.order_items
ALTER COLUMN item_id DROP NOT NULL;

-- 5. items 테이블 한글명 복구 (피킹/인보이스 출력용)
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS name_kr VARCHAR(255),
ADD COLUMN IF NOT EXISTS desc_kr TEXT;
```

---

### Phase 2. G-Manager 백엔드 API 재설계 (`/api/orders`)

#### (1) `GET /api/orders`
```typescript
// Supabase Join 쿼리 예시
const { data, error } = await supabase
  .from('orders')
  .select(`
    id,
    order_no,
    order_date,
    status,
    note,
    shipping_address,
    invoice_number,
    category_invoices,
    invoice_date,
    stores ( id, name, address, store_no ),
    order_items (
      id,
      item_id,
      qty,
      picked_qty,
      uom,
      price,
      invoice_amount,
      custom_item_name,
      items (
        id, sku, name_en, name_kr, desc_en, desc_kr, category,
        unit_price, pack_price, box_price, upc, item_volume,
        inventory (
          locations ( code, zone_type )
        )
      )
    )
  `)
  .order('order_date', { ascending: false });
```

#### (2) `PATCH /api/orders` (상태 변경)
- 기존: `rowIndexes: number[], status: string`
- 변경: `orderId: string, status: string`
```typescript
await supabase
  .from('orders')
  .update({ status, updated_at: new Date().toISOString() })
  .eq('id', orderId);
```

#### (3) `POST /api/orders` (피킹 동기화 및 수기 품목 추가)
- `updates`: 각 `order_items`의 ID를 기준으로 `picked_qty`, `invoice_amount`, `uom` 업데이트.
- `newItems`: `order_id`와 함께 `item_id: null`, `custom_item_name`, `qty: 0`, `picked_qty`, `price`, `uom`으로 `order_items`에 INSERT.
- 상위 `orders.status`를 `INVOICED`로 갱신.

#### (4) `PUT /api/orders` (인보이스 날짜 적용)
- `orderId: string, invoiceDate: string`
```typescript
await supabase
  .from('orders')
  .update({ invoice_date: invoiceDate })
  .eq('id', orderId);
```

---

### Phase 3. 프론트엔드 연동 및 최적화

1. **식별자 매핑 교체**:
   - `order.rowIndexes` ➔ `order.id` (UUID)
   - `item.rowIndex` ➔ `item.id` (UUID)
2. **Realtime 웹소켓 연결 (폴링 대체)**:
   - 기존의 30초 주기 `setInterval` 폴링 대신 Supabase Realtime 구독 사용.

---

## 5. 기대 효과 및 장점

1. **응답 속도 대폭 개선**: Google Sheets API(2~4초) ➔ Supabase 관계형 쿼리(**100~200ms**, 약 20배 속도 향상).
2. **구글 API Quota(분당 300회) 및 동시성 충돌 해소**: 다중 사용자 동시 작업 시 셀 덮어쓰기 문제 원천 해결.
3. **진정한 실시간성(Real-time)**: OrderAPP에서 접수 즉시 웹소켓으로 G-Manager에 주문 카드 푸시.
4. **WMS 시스템과의 단일 원장(Single Source of Truth) 통합**: WMS 재고 할당, 출고 검수, 인보이스 데이터가 하나의 데이터베이스로 완전 통합.
