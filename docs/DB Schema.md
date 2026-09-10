# [DB Schema] WMS_APP 데이터베이스 스키마 및 실시간 재고 원장 명세서

> **시스템 환경**: Supabase (PostgreSQL 15+)  
> **최종 갱신일**: 2026-09-09  
> **관련 문서**: [02_ADR.md](02_ADR.md), [03_TRD.md](03_TRD.md), [DB 개선 사항.md](DB%20개선%20사항.md) (※ 전체 실행용 SQL DDL 및 RPC 코드는 [DB 개선 사항.md](DB%20개선%20사항.md) 참조)

---

## 1. 개요 및 전체 ERD 구조

본 문서는 WMS_APP의 **9개 핵심 테이블 스키마 구성 요약**과 WMS 핵심 엔진인 **실시간 재고 원장(`inventory`)의 작동 메커니즘**을 명세합니다.

### 1.1 엔티티 관계도 (ERD)

```
[stores] ──< [orders] ──< [order_items] >── [items] >── [inventory]
                 │                                           │
             [users] (ADMIN/INSPECTOR/PICKER/STORE)     [locations]
                                                             │
                                             ┌───────────────┤
                                             │               │
                                 [inventory_adjustments] [cycle_count_requests]
                                    (실사 보정 감사 로그)      (긴급/정기 실사 큐)
```

### 1.2 테이블 구성 요약 (9개 핵심 테이블)

| 구분 | 테이블명 | 설명 | 비고 |
|:---:|:---|:---|:---|
| **마스터** | `stores` | 매장 및 고객사 기본 정보 | 배송지 주소 및 연락처 |
| **마스터** | `users` | 작업자 및 관리자 계정 | 4대 역할 (ADMIN, INSPECTOR, PICKER, STORE) |
| **인프라** | `locations` | 창고 로케이션 마스터 | Zone-Aisle-Bay-Level-Bin 5단계 좌표 체계 |
| **인프라** | `items` | 상품 마스터 | 바코드, 단가, 규격, 콜드체인, 안전재고 등 |
| **재고** | `inventory` | **실시간 재고 원장** | 실물재고, 할당재고 분리 및 마이너스 방지 |
| **주문** | `orders` | 주문 헤더 (1건) | 송장번호, 총 청구액, 진행 상태 |
| **주문** | `order_items` | 주문 상세 품목 (N건) | SKU, 주문수량, 피킹수량, 작업자, 시각 |
| **실사** | `inventory_adjustments` | 실사 보정 감사 원장 | INSERT-ONLY (수정/삭제 불가), 5대 사유 코드 |
| **실사** | `cycle_count_requests` | 실사 요청 큐 | URGENT/NORMAL 우선순위, Realtime 연동 |

---

## 2. 9개 핵심 테이블 상세 필드 명세

### 2.1 마스터 정보

#### ① `stores` (매장 / 고객사 마스터)
*기존 구글 시트 `stores` 탭 대응*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | SERIAL | PRIMARY KEY | 매장 고유 식별 번호 |
| `store_no` | VARCHAR(20) | UNIQUE, NOT NULL | 매장 관리 번호 (No) |
| `name` | VARCHAR(100) | NOT NULL | 매장명 |
| `address` | TEXT | NOT NULL | 배송지 주소 |
| `tel` | VARCHAR(30) | NULL | 매장 연락처 |
| `is_active` | BOOLEAN | DEFAULT TRUE | 영업/활성화 여부 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 등록 일시 |

#### ② `users` (사용자 / 작업자 마스터)
*기존 구글 시트 `users` 탭 대응 + 4개 역할 권한 제어*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 작업자 고유 ID (`gen_random_uuid()`) |
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | 로그인 계정용 핸드폰 번호 |
| `name` | VARCHAR(50) | NOT NULL | 사용자 성명 |
| `password_hash` | VARCHAR(255) | NOT NULL | 비밀번호 해시 |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'PICKER' | **역할 권한**: `'ADMIN'`, `'INSPECTOR'`, `'PICKER'`, `'STORE'` |
| `status` | VARCHAR(20) | DEFAULT 'ACTIVE' | 계정 상태 (`'ACTIVE'`, `'INACTIVE'`) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 계정 생성 일시 |

---

### 2.2 물류 인프라 & 상품 마스터

#### ③ `locations` (창고 로케이션 마스터)
*S-Shape 최적 동선 및 5단계 신표준 좌표 체계 (Zone-Aisle-Bay-Level-Bin)*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | VARCHAR(20) | PRIMARY KEY | **로케이션 식별자 (예: `A01-05-B01`)** (인간 판독용) |
| `zone` | VARCHAR(5) | NOT NULL | 존 구분 (`'A'`: 상온, `'F'`: 냉동, `'R'`: 대량 보관) |
| `aisle` | INT | NOT NULL | 통로 번호 (1, 2, ...) — **피킹 1차 정렬 기준** |
| `bay` | INT | NOT NULL | 랙 기둥(열) 번호 (1 ~ 99) — **피킹 2차 정렬 기준** |
| `level` | CHAR(1) | NOT NULL | 선반 단 (`'A'`: 1단, `'B'`: 2단, `'C'`: 3단, `'D'`: 4단) |
| `bin` | INT | NOT NULL, DEFAULT 1 | 단 내 세부 칸 번호 (기본값 `1`) |
| `barcode` | VARCHAR(50) | UNIQUE, NOT NULL | **스캔 바코드 (예: `LOC-A0105B01`)** |
| `max_capacity` | INT | NULL | 해당 칸 최대 적재 가능 박스 수 (공간 관리용) |
| `is_active` | BOOLEAN | DEFAULT TRUE | 사용 가능 여부 |

#### ④ `items` (상품 마스터)
*기존 구글 시트 `Items` 탭 대응 + 5개 신규 필드 추가*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 상품 고유 식별자 (`gen_random_uuid()`) |
| `sku` | VARCHAR(50) | UNIQUE, NOT NULL | 상품 관리 코드 (SKU) |
| `upc` | VARCHAR(50) | UNIQUE, NOT NULL | 바코드 번호 (EAN-13 / UPC) |
| `name` | VARCHAR(100) | NOT NULL | 품목명 (영문/표준) |
| `name_ko` | VARCHAR(100) | NULL | 한국어 품목명 |
| `desc_ko` | TEXT | NULL | 한국어 상세 설명 |
| `category` | VARCHAR(50) | NULL | 카테고리 분류 |
| `item_volume` | NUMERIC(10,2) | NULL | 상품 체적/부피 (차량 적재 및 공간 계산용) |
| `uom` | VARCHAR(20) | DEFAULT 'BOX' | 기본 출고 단위 (`'BOX'`, `'EA'` 등) |
| `units_per_box` | INT | NOT NULL, DEFAULT 1 | **[추가]** 박스당 낱개 수 (UOM 변환용) |
| `unit_price` | NUMERIC(12,2) | DEFAULT 0 | 낱개 단가 |
| `box_price` | NUMERIC(12,2) | DEFAULT 0 | 박스 단가 |
| `zone_type` | VARCHAR(5) | NOT NULL, DEFAULT 'A' | **[추가]** 콜드체인 구분 (`'A'`: 상온, `'F'`: 냉동) |
| `default_location_id` | VARCHAR(20) | REFERENCES locations(id) | 기본 적치 로케이션 |
| `min_stock_qty` | INT | NOT NULL, DEFAULT 0 | **[추가]** 안전 재고 수량 (보충 알림 기준) |
| `shelf_life_days` | INT | NULL | **[추가]** 기본 유통기한 일수 |
| `image_url` | TEXT | NULL | **[추가]** 현장 확인용 상품 이미지 URL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | **[추가]** 단종/판매 중단 시 비활성화 여부 |
| `note` | TEXT | NULL | 특이사항 메모 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 등록 일시 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 |

---

### 2.3 실시간 재고 원장

#### ⑤ `inventory` (로케이션별 실시간 재고 원장)
*실물 재고 수량과 피킹 할당량을 분리 추적하여 무결성 보장*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `location_id` | VARCHAR(20) | PK, REFERENCES locations(id) | 적치된 로케이션 ID |
| `item_id` | UUID | PK, REFERENCES items(id) | 보관 상품 ID |
| `on_hand_qty` | INT | NOT NULL, DEFAULT 0, CHECK(>= 0) | **실물 재고 수량** (실제 랙에 존재하는 총량) |
| `allocated_qty` | INT | NOT NULL, DEFAULT 0, CHECK(>= 0 AND <= on_hand_qty) | **피킹 할당 수량** (주문에 묶여 작업 대기 중인 수량) |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 최종 재고 변동 일시 |

> **가용 재고(Available Qty)** = `on_hand_qty - allocated_qty` (주문 시 즉시 품절 여부 판단 기준)

---

### 2.4 주문 및 피킹 상세 (1:N 정규화)

#### ⑥ `orders` (주문 헤더 - 1건)
*송장 금액 및 매장 정보 중복 방지 (1건의 송장 = 1개 행)*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | VARCHAR(30) | PRIMARY KEY | 주문번호 (예: `ORD-20260908-001`) |
| `invoice_number` | VARCHAR(50) | UNIQUE, NULL | 송장번호 |
| `store_id` | INT | REFERENCES stores(id) | 주문 매장 연결 |
| `order_date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | 주문 일자 |
| `status` | VARCHAR(20) | DEFAULT 'RECEIVED' | 진행 상태 (`RECEIVED`, `ALLOCATED`, `PICKING`, `PICKED`, `DISPATCHED`) |
| `invoice_amount` | NUMERIC(12,2) | DEFAULT 0 | 송장 총 청구액 (1회만 기록) |
| `ordered_by` | UUID | REFERENCES users(id) | 주문 등록자 |
| `note` | TEXT | NULL | 배송/주문 요청 메모 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 등록 일시 |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | 수정 일시 |

#### ⑦ `order_items` (주문 상세 품목 - N건)
*1개 주문에 포함된 품목별 피킹 진행 상태 및 작업자 추적*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 상세 품목 고유 ID (`gen_random_uuid()`) |
| `order_id` | VARCHAR(30) | REFERENCES orders(id) ON DELETE CASCADE | 소속 주문번호 |
| `item_id` | UUID | REFERENCES items(id) | 주문 품목 ID |
| `location_id` | VARCHAR(20) | REFERENCES locations(id) | 피킹 대상 로케이션 |
| `uom` | VARCHAR(20) | NOT NULL | 주문 단위 (`BOX`, `EA`) |
| `price` | NUMERIC(12,2) | NOT NULL | 주문 당시 단가 |
| `qty` | INT | NOT NULL | 주문 요청 수량 |
| `picked_qty` | INT | NOT NULL, DEFAULT 0 | 실제 피킹 완료 수량 |
| `picker_id` | UUID | REFERENCES users(id) | **[추가]** 피킹을 수행한 작업자 |
| `picked_at` | TIMESTAMPTZ | NULL | **[추가]** 피킹 완료 시각 |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' | 품목 상태 (`PENDING`, `PICKED`, `SKIPPED`) |

---

### 2.5 재고 실사 & 긴급 실사 큐 (INSPECTOR 전용)

#### ⑧ `inventory_adjustments` (실사 보정 감사 원장)
*누가/언제/왜 수량을 변경했는지 영구 기록 (INSERT-ONLY 원칙 — 수정/삭제 차단)*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 감사 로그 고유 식별자 (`gen_random_uuid()`) |
| `location_id` | VARCHAR(20) | NOT NULL, REFERENCES locations(id) | 조사 대상 로케이션 |
| `item_id` | UUID | NOT NULL, REFERENCES items(id) | 조사 대상 품목 |
| `previous_qty` | INT | NOT NULL | 보정 전 전산 수량 |
| `counted_qty` | INT | NOT NULL | 실사 후 확정 수량 |
| `diff_qty` | INT | NOT NULL | **오차 수량** (`counted_qty - previous_qty`) |
| `reason_code` | VARCHAR(30) | NOT NULL, CHECK IN (...) | **5대 오차 사유 코드**<br>• `COUNT_MISMATCH` (수량 오차)<br>• `DAMAGED` (상품 파손)<br>• `LOST` (분실)<br>• `FOUND` (전산외 재고 발견)<br>• `EXPIRED` (유통기한 경과) |
| `note` | TEXT | NULL | 현장 특이사항 메모 |
| `inspector_id` | UUID | NOT NULL, REFERENCES users(id) | 실사를 수행한 INSPECTOR |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 보정 실행 일시 |

#### ⑨ `cycle_count_requests` (긴급 / 정기 실사 큐)
*피킹 결품(`CMD-SKIP`) 발생 시 자동 인서트 및 Realtime 알림*

| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 큐 요청 고유 ID (`gen_random_uuid()`) |
| `location_id` | VARCHAR(20) | NOT NULL, REFERENCES locations(id) | 실사 필요 로케이션 |
| `item_id` | UUID | NOT NULL, REFERENCES items(id) | 실사 필요 품목 |
| `priority` | VARCHAR(10) | NOT NULL, DEFAULT 'NORMAL', CHECK IN ('URGENT','NORMAL') | **우선순위** (`'URGENT'`: 피킹 결품 시 즉시 배정, `'NORMAL'`: 정기 실사) |
| `status` | VARCHAR(20) | NOT NULL, DEFAULT 'PENDING', CHECK IN (...) | 진행 상태 (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) |
| `reported_by` | UUID | REFERENCES users(id) | 결품(SKIP)을 보고한 PICKER |
| `completed_by` | UUID | REFERENCES users(id) | 실사를 확인/완료한 INSPECTOR |
| `completed_at` | TIMESTAMPTZ | NULL | 실사 완료 시각 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 큐 요청 생성 일시 |

---

## 3. [심층 분석] 실시간 재고 원장(`inventory`) 작동 원리

**실시간 재고 원장(`inventory`)**은 WMS(창고 관리 시스템)의 **'심장'**에 해당하는 핵심 테이블입니다.

### 3.1 왜(Why) 이용하는가?

| 기존 구글 시트의 한계 | 실시간 재고 원장(`inventory`) 도입 후 해결 |
|:---|:---|
| **물건이 몇 개 남았는지 모름**<br>(상품명과 로케이션 위치만 기재됨) | **로케이션별 정확한 수량 파악**<br>(예: `A01-05-B01`에 진라면이 정확히 42박스 있음) |
| **유령 주문 & 결품 빈발**<br>(재고가 없는데 주문을 받아 피킹 도중 품절 확인) | **주문 접수 즉시 품절 사전 차단**<br>(가용 재고가 0이면 주문창에서 사전 품절 처리) |
| **이중 할당 (가로채기) 발생**<br>(A 주문 피킹 중인데 B 주문이 같은 재고를 가져감) | **`allocated_qty`(할당 재고)**로 피킹 예약 수량을 묶어두어 이중 피킹 원천 차단 |
| **마이너스 재고 오류**<br>(전산 재고가 -5개로 떨어지는 데이터 왜곡) | DB 제약조건(`CHECK on_hand_qty >= 0`)으로 **마이너스 발생을 물리적으로 차단** |

---

### 3.2 언제(When) 이용되는가? — 물류 라이프사이클 5단계

물류의 모든 흐름(입고 ➔ 주문 ➔ 피킹 ➔ 실사 ➔ 이동)에서 실시간으로 읽고 씁니다.

```
[1. 입고] ───> [2. 주문 접수] ───> [3. 피킹 출고]
 (재고 증가)    (할당재고 잠금)     (실재고 차감)
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
   [4. 현장 실사]             [5. 로케이션 이동]
   (오차 발견 시 보정)         (A 로케이션 ➔ B 로케이션)
```

1. **입고/적치 시 (Inbound)**:
   * 공장/도매처에서 물건이 입고되어 선반(Rack)에 진열할 때 `on_hand_qty` 증가.
2. **매장 주문 접수 시 (Order Allocation)**:
   * 매장에서 10박스를 주문하면, 팔릴 예정이므로 `allocated_qty`를 +10 올려 다른 주문이 못 건드리게 잠금(Lock).
3. **피커가 피킹 완료 후 출고 시 (Outbound)**:
   * 물건이 박스에 실려 트럭으로 나가면 `on_hand_qty` -10, `allocated_qty` -10을 동시에 차감.
4. **인스펙터가 현장 재고 실사할 때 (Cycle Count)**:
   * 전산에는 42개인데 실물이 40개뿐이면 `adjust_inventory_stock()` 함수를 통해 전산 원장을 40개로 보정하고 오차 로그 기록.
5. **로케이션 간 이동 시 (Transfer)**:
   * 보관존(`R`)에서 피킹존(`A`)으로 물건을 옮길 때 출발지 수량 차감, 도착지 수량 증가.

---

### 3.3 어떻게(How) 이용되는가? — 실제 수치 작동 시나리오

이 테이블은 **2개의 핵심 수치**로 작동합니다:
* **`on_hand_qty` (실물 재고)**: 실제 선반 위에 눈으로 보이는 총 박스 수
* **`allocated_qty` (할당 재고)**: 주문이 들어와서 피커가 곧 가져가기로 예약된 박스 수

> 💡 **가용 재고 (Available Stock)** = **`on_hand_qty` - `allocated_qty`** (추가 주문 가능한 수량)

#### 📊 실제 흐름 시나리오 (예: 신라면 컵)

| 단계 | 상황 | on_hand_qty (실물) | allocated_qty (예약) | 가용 재고 (주문가능) | 설명 |
|:---:|:---|:---:|:---:|:---:|:---|
| **초기** | 랙에 50박스 진열됨 | **50** | **0** | **50** | 50박스 주문 가능 |
| **주문 1** | A매장에서 10박스 주문 접수 | **50** | **10** (+10) | **40** | 물건은 아직 랙에 있지만, 다른 매장은 40박스만 주문 가능 |
| **주문 2** | B매장에서 40박스 주문 접수 | **50** | **50** (+40) | **0** | 가용 재고 소진 (C매장은 품절로 주문 불가) |
| **피킹** | 피커가 10박스를 카트에 담음 | **40** (-10) | **40** (-10) | **0** | 창고에서 실제 물건이 빠져나감 |
| **실사** | 인스펙터가 세어보니 39박스뿐 (1박스 파손) | **39** (-1) | **40** | **-1 (오류 감지!)** | 시스템이 즉시 관리자에게 경고 및 결품 방지 조치 트리거 |

---

### 3.4 데이터 무결성 보장 장치 (PostgreSQL DB 제약조건)

실시간 재고 원장에는 인간의 실수나 시스템 버그를 방어하는 **강력한 2가지 안전장치**가 걸려 있습니다:

```sql
CONSTRAINT chk_positive_stock CHECK (on_hand_qty >= 0),
CONSTRAINT chk_allocated CHECK (allocated_qty >= 0 AND allocated_qty <= on_hand_qty)
```

1. **`chk_positive_stock` (음수 차단)**:
   * 어떤 API 버그가 발생하더라도 재고 수량이 `-1` 이하로 내려가는 UPDATE는 **데이터베이스 엔진 수준에서 즉시 에러를 뱉으며 롤백(Rollback)**시킵니다.
2. **`chk_allocated` (초과 예약 차단)**:
   * 창고에 있는 실물 재고(`on_hand_qty`)보다 더 많은 수량을 주문 배정(`allocated_qty`)할 수 없도록 강제합니다.
