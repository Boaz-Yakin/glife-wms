# Supabase 데이터베이스 설계 가이드 및 모범 사례 (WMS 기반)

본 문서는 현재 프로젝트(WMS)를 구축하며 확립한 **Supabase 데이터베이스 설계 원칙과 아키텍처 노하우**를 정리한 문서입니다. 향후 새로운 어드민 플랫폼이나 SaaS 프로젝트를 기획/설계할 때 플레이북(Playbook)으로 참고하기 위해 작성되었습니다.

---

## 1. 핵심 설계 원칙 (Core Principles)

### 1.1 PK (Primary Key)는 반드시 UUID 활용
- **이유**: `Auto-increment ID(1, 2, 3...)`는 크롤링에 취약하고 시스템 통합 시 충돌이 발생하기 쉽습니다. 
- **원칙**: 모든 테이블의 ID는 `UUID` 타입을 사용하며, 기본값으로 `gen_random_uuid()`를 지정합니다.
- **예외**: 사람이 직접 읽고 식별해야 하는 바코드나 고유번호(예: SKU, 주문번호)는 별도의 `VARCHAR` 컬럼(`sku`, `order_no`)으로 관리하고 `UNIQUE` 제약조건을 겁니다.

### 1.2 상태 및 구분값은 ENUM 활용
- **이유**: 단순 텍스트(VARCHAR)로 상태값을 받으면 오타('PENDNG')나 예외 데이터가 DB에 들어갈 위험이 큽니다.
- **원칙**: 상태값(Status), 파트너 유형(Type) 등 종류가 고정된 데이터는 `CREATE TYPE ... AS ENUM`을 사용하여 강제합니다.
- **적용 사례**: 
  - `user_role` : ('ADMIN', 'INSPECTOR', 'PICKER', 'STORE')
  - `partner_type` : ('MANUFACTURER', 'SUPPLIER', 'BOTH')

### 1.3 마스터 데이터의 정규화 (Normalization)
- **이유**: 데이터 중복을 막고 일관성을 유지하기 위함입니다.
- **원칙**: 엑셀에서는 하나의 열에 '제조사명', '공급사명'을 텍스트로 적지만, DB에서는 이를 별도의 `partners` 테이블로 분리합니다.
- **효과**: 특정 제조사의 이름이 바뀌거나 연락처가 변경될 때, 수만 개의 아이템 데이터를 수정할 필요 없이 `partners` 테이블의 레코드 하나만 수정하면 됩니다.

---

## 2. WMS 핵심 테이블 설계 패턴

WMS(창고관리시스템)와 같은 B2B 시스템의 데이터는 크게 3가지 계층으로 나뉩니다.

### 2.1 마스터 데이터 (Master Data)
- **특징**: 한 번 등록되면 잘 변하지 않는 기준 정보입니다.
- **테이블**: `items`(상품), `locations`(위치), `partners`(거래처/파트너), `users`(사용자)
- **설계 팁**: 엑셀(CSV) 대량 업로드가 빈번하므로, 컬럼명을 직관적으로 작성(`name_en`, `desc_kr`)하여 템플릿 파일과 1:1 매핑이 쉽도록 설계합니다.

### 2.2 원장 및 스냅샷 (Ledger & Snapshot)
- **특징**: 현재의 정확한 '상태'를 보여주는 실시간 데이터입니다.
- **테이블**: `inventory`(실시간 재고 원장)
- **설계 팁**: `on_hand_qty`(보유재고)와 `allocated_qty`(할당재고)를 분리하여 가용재고를 계산할 수 있게 해야 합니다. 반드시 `CHECK (on_hand_qty >= 0)` 제약조건을 걸어 마이너스 재고를 원천 차단합니다.

### 2.3 트랜잭션 및 로그 (Transaction & Logs)
- **특징**: 불변성(Immutability)을 가져야 하며, 과거의 이력을 추적할 수 있어야 합니다.
- **테이블**: `orders`(주문), `order_items`(주문 상세), `inventory_adjustments`(재고 조정 이력)
- **설계 팁**: 재고 조정(Audit) 시 기존 수량 테이블을 단순히 `UPDATE` 하는 것에 그치지 않고, 반드시 `inventory_adjustments` 로그 테이블에 `INSERT` 되도록 DB 트리거(Trigger)나 RPC 함수를 구성합니다.

---

### 2.4 상세 테이블 명세 (Schema Details)

아래는 WMS를 구성하는 핵심 테이블들의 실제 구성 항목(Schema) 예시입니다.

#### ① `stores` (매장 / 고객사 마스터)
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
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 작업자 고유 ID (`gen_random_uuid()`) |
| `phone` | VARCHAR(20) | UNIQUE, NOT NULL | 로그인 계정용 핸드폰 번호 |
| `name` | VARCHAR(50) | NOT NULL | 사용자 성명 |
| `password_hash` | VARCHAR(255) | NOT NULL | 비밀번호 해시 |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'PICKER' | **역할 권한**: `'ADMIN'`, `'INSPECTOR'`, `'PICKER'`, `'STORE'` |
| `status` | VARCHAR(20) | DEFAULT 'ACTIVE' | 계정 상태 (`'ACTIVE'`, `'INACTIVE'`) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | 계정 생성 일시 |

#### ③ `locations` (창고 로케이션 마스터)
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | VARCHAR(20) | PRIMARY KEY | **로케이션 식별자 (예: `A01-05-B01`)** |
| `zone` | VARCHAR(5) | NOT NULL | 존 구분 (`'A'`: 상온, `'F'`: 냉동, `'R'`: 대량 보관) |
| `aisle` | INT | NOT NULL | 통로 번호 — 피킹 1차 정렬 기준 |
| `bay` | INT | NOT NULL | 랙 기둥(열) 번호 — 피킹 2차 정렬 기준 |
| `level` | CHAR(1) | NOT NULL | 선반 단 (`'A'`: 1단, `'B'`: 2단 등) |
| `bin` | INT | NOT NULL, DEFAULT 1 | 단 내 세부 칸 번호 |
| `barcode` | VARCHAR(50) | UNIQUE, NOT NULL | **스캔 바코드 (예: `LOC-A0105B01`)** |
| `max_capacity` | INT | NULL | 최대 적재 가능 박스 수 |

#### ④ `items` (상품 마스터)
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 상품 고유 식별자 (`gen_random_uuid()`) |
| `sku` | VARCHAR(50) | UNIQUE, NOT NULL | 상품 관리 코드 (SKU) |
| `upc` | VARCHAR(50) | UNIQUE, NOT NULL | 바코드 번호 (EAN-13 / UPC) |
| `name_en` | VARCHAR(255) | NOT NULL | 품목명 (영문/표준) |
| `name_kr` | VARCHAR(255) | NULL | 한국어 품목명 |
| `desc_en` | TEXT | NULL | 영문 상세 설명 |
| `desc_kr` | TEXT | NULL | 한국어 상세 설명 |
| `category` | VARCHAR(100) | NULL | 카테고리 분류 |
| `item_volume` | NUMERIC(10,3) | NULL | 상품 부피 |
| `uom` | VARCHAR(20) | NOT NULL | 출고 단위 (`BOX`, `EA` 등) |
| `units_per_box` | INT | NULL | 박스당 낱개 수 |
| `unit_price` | NUMERIC(12,2) | NOT NULL | 낱개 단가 |
| `pack_price` | NUMERIC(12,2) | NULL | 팩(묶음) 단가 |
| `box_price` | NUMERIC(12,2) | NULL | 박스 단가 |
| `zone_type` | VARCHAR(5) | NOT NULL, DEFAULT 'A' | 콜드체인 구분 (`'A'`, `'F'`) |
| `manufacturer_id` | UUID | REFERENCES partners(id) | 제조사 ID |
| `supplier_id` | UUID | REFERENCES partners(id) | 공급사 ID |
| `min_stock_qty` | INT | DEFAULT 0 | 안전 재고 수량 |
| `shelf_life_days` | INT | NULL | 기본 유통기한 일수 |
| `image_url` | TEXT | NULL | 현장 확인용 이미지 URL |
| `is_active` | BOOLEAN | DEFAULT TRUE | 단종 여부 |
| `note` | TEXT | NULL | 특이사항 메모 |

#### ⑤ `partners` (제조사/공급사 마스터)
| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
| --- | --- | --- | --- |
| `id` | UUID | PRIMARY KEY | 파트너 고유 ID (`gen_random_uuid()`) |
| `name` | VARCHAR(255) | NOT NULL | 파트너사 이름 |
| `type` | ENUM | DEFAULT 'BOTH' | 파트너 타입 (`'MANUFACTURER'`, `'SUPPLIER'`, `'BOTH'`) |
| `contact_person` | VARCHAR(100) | | 담당자명 |
| `phone` | VARCHAR(50) | | 연락처 |
| `email` | VARCHAR(100) | | 이메일 |
| `address` | TEXT | | 주소 |

#### ⑥ `inventory` (실시간 재고 원장)
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `location_id` | VARCHAR(20) | PK, REFERENCES locations(id) | 적치된 로케이션 ID |
| `item_id` | UUID | PK, REFERENCES items(id) | 보관 상품 ID |
| `on_hand_qty` | INT | NOT NULL, CHECK(>= 0) | **실물 재고 수량** |
| `allocated_qty` | INT | NOT NULL, CHECK(>= 0) | **피킹 할당 수량** (주문 예약분) |

#### ⑦ `orders` (주문 헤더)
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | VARCHAR(30) | PRIMARY KEY | 주문번호 |
| `invoice_number` | VARCHAR(50) | UNIQUE, NULL | 송장번호 |
| `store_id` | INT | REFERENCES stores(id) | 주문 매장 연결 |
| `status` | VARCHAR(20) | DEFAULT 'RECEIVED' | 진행 상태 |
| `invoice_amount` | NUMERIC(12,2) | DEFAULT 0 | 송장 총 청구액 |
| `ordered_by` | UUID | REFERENCES users(id) | 주문 등록자 |

#### ⑧ `order_items` (주문 상세 품목)
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 상세 품목 고유 ID |
| `order_id` | VARCHAR(30) | REFERENCES orders(id) | 소속 주문번호 |
| `item_id` | UUID | REFERENCES items(id) | 주문 품목 ID |
| `location_id` | VARCHAR(20) | REFERENCES locations(id) | 피킹 대상 로케이션 |
| `uom` | VARCHAR(20) | NOT NULL | 주문 단위 |
| `qty` | INT | NOT NULL | 주문 요청 수량 |
| `picked_qty` | INT | DEFAULT 0 | 실제 피킹 완료 수량 |
| `picker_id` | UUID | REFERENCES users(id) | 피킹 수행 작업자 |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' | 품목 상태 (`PENDING`, `PICKED`, `SKIPPED`) |

#### ⑨ `inventory_adjustments` (실사 보정 감사 원장)
| 컬럼명 | 타입 | 제약조건 | 설명 & 특징 |
|:---|:---|:---|:---|
| `id` | UUID | PRIMARY KEY | 감사 로그 고유 식별자 |
| `location_id` | VARCHAR(20) | NOT NULL | 조사 대상 로케이션 |
| `item_id` | UUID | NOT NULL | 조사 대상 품목 |
| `previous_qty` | INT | NOT NULL | 보정 전 전산 수량 |
| `counted_qty` | INT | NOT NULL | 실사 후 확정 수량 |
| `diff_qty` | INT | NOT NULL | **오차 수량** |
| `reason_code` | VARCHAR(30) | NOT NULL | 오차 사유 코드 (`DAMAGED`, `LOST` 등) |
| `inspector_id` | UUID | NOT NULL | 실사 수행 INSPECTOR |

---

## 3. 프론트엔드 연동 및 타입 강제 (SSOT)

Supabase를 사용할 때 가장 강력한 장점 중 하나는 데이터베이스를 **단일 진실 공급원(SSOT, Single Source of Truth)**으로 사용할 수 있다는 점입니다.

### 3.1 TypeScript 자동 생성 워크플로우
1. DB에서 테이블과 컬럼(예: `pack_price`, `name_en`)을 생성/수정합니다.
2. Supabase CLI를 통해 프론트엔드 코드 내 `database.ts`를 자동 생성(업데이트)합니다.
   ```bash
   npx supabase gen types typescript --project-id "프로젝트ID" > src/types/database.ts
   ```
3. 프론트엔드(Next.js) 코드를 빌드(`npm run build`)합니다. 
4. DB 구조 변경으로 인해 필드명이 달라진 곳(예: `item.name` ➔ `item.name_en`)에서 발생하는 컴파일 에러를 수정합니다.

### 3.2 any 타입 사용 금지
서비스 로직(Service layer)에서 `(supabase as any)`와 같은 타입 우회 코드를 사용하면 빌드 타임 에러를 잡을 수 없습니다. 항상 생성된 `Database` 제네릭을 주입하여 완전한 타입 세이프(Type-safe) 환경을 구축해야 합니다.

---

## 4. 데이터 초기 세팅 (Data Migration) 전략

- **외래키(Foreign Key) 업로드 순서**: 관계형 DB에서는 부모 데이터가 먼저 존재해야 합니다.
  - ❌ *잘못된 방법*: `items` 엑셀을 먼저 업로드 (에러 발생)
  - ✅ **올바른 방법**: `locations`, `partners` 마스터 엑셀을 먼저 업로드 ➔ 생성된 고유 UUID들을 `items` 엑셀의 `manufacturer_id` 등에 복사 ➔ `items` 엑셀 업로드
- **CSV 헤더 매칭**: 업로드용 CSV의 첫 번째 줄(Header) 영문명은 실제 Supabase DB 컬럼명과 **대소문자까지 100% 일치**해야 자동 매핑 에러를 방지할 수 있습니다.

---

## 5. 보안 정책 (Row Level Security - RLS)

- B2B 어드민/SaaS에서는 **RLS를 무조건 활성화(ENABLE)**하는 것을 원칙으로 합니다.
- `items`, `partners` 같은 마스터 데이터는 누구나 볼 수 있도록 `FOR SELECT TO authenticated USING (true)` 정책을 엽니다.
- 재고 조정(`inventory_adjustments`)과 같은 민감한 작업은 `ADMIN`이나 `INSPECTOR` 권한을 가진 사용자만 `INSERT` 할 수 있도록 `auth.uid()`와 Role 검증 로직을 결합하여 통제합니다.
