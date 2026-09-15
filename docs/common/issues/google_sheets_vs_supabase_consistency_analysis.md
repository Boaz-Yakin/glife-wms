# [분석 보고서] 구글 시트(glifeinfo) 기반 시스템과 Supabase DB 스키마 간 데이터 충돌 및 일관성 분석

> **작성 일자**: 2026-09-09  
> **분석 대상**:
> - 신규 DB 설계: `docs/DB Schema.md`, `docs/DB 개선 사항.md` (Supabase PostgreSQL 15+)
> - 현행 운영 시스템: `OrderApp` (주문앱), `g-manager` (주문접수 및 피킹/송장 관리 Web)
> - 현행 데이터베이스: Google Sheets `glifeinfo` (Spreadsheet ID: `1wk8MWsd5oXKbhCCnzNWutGkefl3IOAYrIznO-HRFX_I`)

---

## 1. 개요 (Executive Summary)

현재 운영 중인 `g-manager`와 `OrderApp`은 구글 시트(`glifeinfo`)의 `Orders`, `Items`, `stores`, `Users` 탭을 백엔드 DB로 직접 읽고 쓰고 있습니다.

반면, 새로 정의된 `docs/DB Schema.md`는 **관계형 정규화(3NF) 기반의 PostgreSQL(Supabase)** 구조로 설계되었습니다.

만약 **현행 두 앱이 구글 시트를 계속 사용하는 상태에서 mobile-app만 Supabase로 분리 구성할 경우**, 데이터 모델의 근본적인 차이(비정규화 Flat 구조 vs 1:N 정규화 구조), 실시간 재고 개념의 부재, 고유 주문 식별자 부재로 인해 **심각한 데이터 불일치(Data Discrepancy)와 동시성 충돌**이 발생합니다.

---

## 2. 코드 레벨 현황 분석 (현행 시스템 작동 방식)

### 2.1 OrderApp (`c:\Users\boazn\Projects\OrderApp`)
- **주문 생성 (`submitOrder`)**:
  - `Orders` 탭에 1개 주문 내 포함된 품목 수만큼 행(Row)을 각각 `append` (비정규화 플랫 방식).
  - 고유 주문 ID(Order ID)를 생성하지 않으며, `ORDER_DATE` (밀리초 단위 타임스탬프)와 `STORE_NAME`으로 묶어 배치 식별.
  - `PRICE` 컬럼에 `수량(QTY) × 단가`(**라인 총액**)를 계산하여 기록.
  - `STATUS` 기본값은 `'PENDING'`.
- **회원 인증 (`findUserByPhone`)**:
  - `Users` 탭의 `PHONE`, `PASSWORD_HASH`(bcrypt)를 직접 조회하여 로그인 및 JWT 토큰 발급.
- **상품 조회 (`getItemsList`)**:
  - `Items` 탭에서 `UOM`이 BOX/PACK이면 `box_price`, 그 외는 `unit_price`를 동적으로 매핑하여 단가 결정.

### 2.2 g-manager (`c:\Users\boazn\Projects\g-manager`)
- **피킹 및 송장 처리 (`updatePickAndInvoiceData`)**:
  - 구글 시트의 특정 **`rowIndex`**를 기반으로 `STATUS`를 `'INVOICED'`로 변경하고 `PICKED_QTY`, `INVOICE_AMOUNT`, `UPDATED_BY`, `UPDATED_AT` 셀을 덮어씀 (`batchUpdate`).
  - 현장에서 추가된 추가 품목은 `append`로 행 삽입.
- **송장 번호 부여 (`saveInvoiceNumbers`)**:
  - `rowIndex`를 매핑 키로 사용하여 `INVOICE_NUMBER` 열에 값 기입.

---

## 3. 엔티티/도메인별 상세 충돌 및 일관성 분석

### ① 주문 데이터 (`Orders` 탭 vs `orders` + `order_items` 테이블) — 🚨 [CRITICAL]

| 비교 항목 | 현재 구글 시트 (`glifeinfo`) | Supabase 설계안 (`DB Schema.md`) | 충돌 및 일관성 문제 |
|:---|:---|:---|:---|
| **데이터 구조** | **비정규화 Flat 구조**<br>(1개 주문에 5개 품목 = 5개 행 생성) | **1:N 정규화 분리**<br>(`orders` 1건 + `order_items` N건) | **동기화 매핑 충돌**: 시트의 복수 행을 DB의 1개 헤더와 N개 상세로 분해/재조합하는 변환 오버헤드 및 누락 위험 |
| **주문 식별자** | **고유 ID 없음**<br>(`ORDER_DATE + STORE_NAME` 조합 또는 시트 `rowIndex`로 제어) | **`id` (PK, e.g. `ORD-20260908-001`)** | OrderApp에서 주문 접수 시 주문번호가 발급되지 않아 두 시스템 간 1:1 주문 추적 불가 |
| **송장 금액**<br>(`invoice_amount`) | 각 행마다 전체 송장 총액이 **중복 기재**되거나 첫 행에만 기재 | `orders` 헤더 테이블에 **단 1회만 기록** | 시트에서 `SUM(INVOICE_AMOUNT)` 쿼리 시 품목 수만큼 곱해져 매출액 왜곡 발생 |
| **가격(Price) 정의** | `PRICE` 열에 **`QTY * 단가` (라인 총액)**가 저장됨 | `order_items.price`는 **단가 (Unit Price)**로 정의됨 | **단가 vs 품목 총액의 정의 충돌**: 데이터 이전 시 금액이 10~100배로 뻥튀기될 위험 |
| **주문 상태값** | `PENDING` ➔ `INVOICED` | `RECEIVED` ➔ `ALLOCATED` ➔ `PICKING` ➔ `PICKED` ➔ `DISPATCHED` | WMS 작업 진행 상황(할당, 피킹 중, 피킹 완료)이 시트에는 표현 불가 |
| **갱신 방식** | `rowIndex`를 짚어서 셀을 직접 Overwrite | Primary Key (`id`) 기반의 트랜잭션 UPDATE | 중간에 시트 행이 삽입/삭제되면 `rowIndex`가 밀려 엉뚱한 주문이 수정되는 **팬텀 업데이트 위험** |

---

### ② 재고 원장 (`inventory` 테이블) — 🚨 [HIGH]

- **현상**:
  - 구글 시트에는 재고 수량 컬럼이 아예 존재하지 않습니다 (`Items` 탭에 보관 위치명만 텍스트로 기재).
  - Supabase 설계는 `inventory`에 `on_hand_qty`(실물 재고), `allocated_qty`(할당 재고)를 두고 DB 제약조건(`CHECK`)으로 마이너스 재고를 원천 차단합니다.
- **충돌 및 일관성 문제**:
  1. **사전 품절 차단 무력화**: OrderApp이 구글 시트만 바라보고 주문을 접수하면, WMS의 가용재고(`on_hand - allocated`)를 사전에 확인하지 못하므로 **이미 창고에 없는 품목의 주문이 계속 접수**됩니다.
  2. **이중 할당(가로채기) 방지 실패**: WMS의 핵심 안전장치인 `allocated_qty`(주문 배정 시 재고 잠금)가 작동하지 않아 피커들이 같은 재고를 경합하는 문제가 지속됩니다.

---

### ③ 상품 및 로케이션 마스터 (`items`, `locations`) — ⚠️ [MEDIUM]

| 구분 | 현재 구글 시트 (`Items` 탭) | Supabase (`items`, `locations`) | 일관성 검토 및 조치 필요 사항 |
|:---|:---|:---|:---|
| **로케이션** | `warehouse location`, `shelf`에 자유 텍스트 (예: `A-1`, `Cold Room`) | `locations` 테이블의 엄격한 5단계 좌표 (`A01-05-B01`) 및 FK 참조 | 시트의 비정규 텍스트를 Supabase에 그대로 넣을 경우 **FK 위반 에러** 발생. 로케이션 마스터 사전 정제 필수 |
| **UOM & 단가** | `UOM`('BOX'/'EA'), `box_price`, `unit_price` 별도 컬럼 존재 | `items`에 `box_price`, `unit_price`, `units_per_box` 포함 | **호환 양호**: 두 스키마의 필드 구조가 일치하여 데이터 마이그레이션 용이 |
| **온도 구분** | 별도 컬럼 없음 (텍스트 메모에 혼재) | `zone_type` (`'A'` 상온, `'F'` 냉동) 필수 컬럼 | 시트 데이터 이관 시 상품별 상온/냉동(`zone_type`) 기본값 부여 및 검수 필요 |

---

### ④ 매장 및 사용자 마스터 (`stores`, `users`) — ⚠️ [MEDIUM]

- **`stores` (매장)**:
  - 구글 시트는 매장명(`storeName`)과 주소 위주이며 `No`가 누락된 행이 존재.
  - Supabase는 `store_no VARCHAR(20) UNIQUE NOT NULL`을 강제하므로, 마이그레이션 시 매장 번호 생성 및 매핑 선행 필요.
- **`users` (인증 체계)**:
  - OrderApp은 구글 시트 `Users` 탭의 `PHONE`, `PASSWORD_HASH`를 직접 조회하여 인증을 처리함.
  - Supabase로 사용자 테이블을 분리할 경우, OrderApp에서 신규 가입한 사용자가 WMS/g-manager에서는 인식되지 않거나 비밀번호 변경 시 계정 불일치 발생.

---

## 4. 운영 시나리오별 리스크 평가

### ❌ 시나리오 A: 구글 시트와 Supabase를 병행하여 각각 직접 쓰기 (절대 비권장)
```
[OrderApp / g-manager] ───(직접 쓰기)───> [Google Sheets (glifeinfo)]
                                                   │
                                       (실시간 동기화 불가능 - 시차 발생)
                                                   ▼
[mobile-app]              ───(직접 쓰기)───> [Supabase DB]
```
- **치명적 위험**:
  - 구글 시트에서 주문 취소/수정이 일어났을 때 WMS Supabase에 실시간 반영되지 않아 **이미 취소된 주문을 피킹/출고하는 물류 사고** 발생.
  - 구글 시트의 행 삽입/정렬로 인해 `rowIndex`가 어긋나 `g-manager`가 엉뚱한 주문을 `INVOICED`로 덮어쓰는 무결성 붕괴 발생.

### ⚠️ 시나리오 B: 구글 시트 ➔ Supabase 단방향 동기화 파이프라인
- 구글 시트에 주문이 들어오면 Webhook/Apps Script를 통해 Supabase로 즉시 복제.
- **한계**: WMS 피킹 수량 및 확정 상태(`PICKED`, `DISPATCHED`)를 다시 구글 시트의 해당 `rowIndex`로 정확히 역동기화하는 로직이 매우 취약함.

###  시나리오 C: Supabase를 단일 진실 공급원(SSOT)으로 일원화 (강력 권장)
```
[OrderApp]      ───┐
[g-manager]     ───┼───(Next.js Server API)───> [Supabase DB (SSOT)]
[mobile-app]       ───┘                                   │
                                            (트리거 / Webhook)
                                                       ▼
                                            [Google Sheets (조회/백업 전용)]
```
- 모든 앱(`OrderApp`, `g-manager`, `mobile-app`)이 Supabase를 단일 원장(SSOT)으로 사용.
- 구글 시트는 관리자 엑셀 조회 및 보고서 출력용으로만 비동기 동기화.

---

## 5. 단계적 전환 및 해결 로드맵 (Action Plan)

1. **[1단계: 주문 식별자 및 가격 정책 정립]**
   - 구글 시트 `Orders` 탭에 고유 `ORDER_ID` 열을 사전 추가.
   - `PRICE` 컬럼이 '품목 단가'인지 '품목 총액(단가×수량)'인지 명확히 분리하여 데이터 표준화.
2. **[2단계: 마스터 데이터 정제 (Locations, Stores)]**
   - 구글 시트 `Items` 탭의 자유 텍스트 위치를 Supabase의 신표준 로케이션 코드(`A01-05-B01`)로 치환.
   - `stores` 탭의 누락된 매장 관리 번호(`store_no`) 부여.
3. **[3단계: OrderApp & g-manager API 전환]**
   - `OrderApp`의 `submitOrder`와 `findUserByPhone`이 구글 시트 대신 Supabase PostgreSQL을 호출하도록 엔드포인트 교체.
   - `g-manager`의 주문 목록 조회 및 상태 변경 API를 Supabase 트랜잭션 쿼리로 전환.
4. **[4단계: 재고 원장(`inventory`) 활성화]**
   - WMS 입고/실사 데이터를 기반으로 `inventory`에 초기 재고(`on_hand_qty`) 등록.
   - OrderApp에서 주문 접수 시 Supabase RPC를 통해 가용 재고 검증 및 `allocated_qty` 자동 잠금 활성화.
