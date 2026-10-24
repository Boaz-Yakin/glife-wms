# 🚀 WMS/SCM 솔루션 상품화 및 타 창고 커스터마이징 개발 매뉴얼
> **Target Ecosystem**: `WMS Web-App`, `WMS Mobile-App (PWA)`, `OrderAPP (B2B 발주)`, `G-Manager (ERP/총괄)`  
> **Architecture Goal**: 코드 수정 없이 설정(Configuration)과 정책(Policy)만으로 신규 창고/기업에 즉시 이식 가능한 Multi-Tenant SaaS 체계 구축

---

## 1. 개요 및 상품화(Productization) 비전

현재 구축된 4개 시스템은 물류 라이프사이클의 전 영역(주문 인입 $\rightarrow$ 창고 피킹/적치 $\rightarrow$ 재고 최적화 $\rightarrow$ 정산)을 유기적으로 관통하고 있습니다.

이를 단일 창고용 내부 도구에서 **"임의의 3PL 창고, 제조 공장, 유통 기업이 즉시 도입할 수 있는 B2B SaaS 솔루션"**으로 전환하기 위한 핵심 철학은 다음과 같습니다:

```
[지향점: Zero-Code Warehouse Adaptation]
"창고의 물리적 레이아웃, 바코드 체계, 보관 온도대, 유통기한 정책이 달라도
 소스 코드를 새로 짜지 않고, 관리자 GUI 설정과 엑셀 마이그레이션만으로 24시간 내 온보딩한다."
```

---

## 2. 4개 시스템 생태계 역할 및 데이터 흐름

```mermaid
flowchart TD
    subgraph OrderApp["🛒 1. OrderApp (주문/가맹점)"]
        OA1["가맹점/고객사 발주"] --> OA2["실시간 가용재고 확인"]
        OA2 --> OA3["주문 생성 (Status: PENDING)"]
    end

    subgraph WMS_Core["🏢 2. WMS Web-App (물류 본부 관제)"]
        W1["자동 소프트 할당 (Triggers)"]
        W2["2D 창고 맵 & 스테이징 통제"]
        W3["동적 재고 임계치 & FEFO 분석"]
        W4["라벨 인쇄 & 마스터 관리"]
    end

    subgraph WMS_Mobile["📱 3. WMS Mobile-App (현장 PWA)"]
        M1["카메라/외장 바코드 스캔"]
        M2["입고 적치 (Put-away + FEFO/Lot)"]
        M3["동선 최적화 피킹 (Wave Picking)"]
        M4["로케이션 이동 & 재고 실사 (Audit)"]
    end

    subgraph G_Manager["📊 4. G-Manager (ERP / 정산 / 파트너)"]
        G1["공급사(Supplier) PO 발주 관리"]
        G2["인보이스 발행 & 마진/원가 분석"]
        G3["통합 세일즈 리포트"]
    end

    OA3 -->|주문 인입| W1
    W1 -->|피킹 지시| M3
    M2 -->|입고 완료 실적| W3
    M3 -->|출고 완료 (SHIPPED)| G2
    G1 -->|입고 예정 정보| M2
```

---

## 3. 타 창고 특수 환경 맞춤 적응 엔진 (Core Adaptation Engines)

신규 창고 도입 시 직면하는 5가지 이질적인 환경을 흡수하기 위한 모듈형 엔진 설계입니다.

### ① 창고 물리 구조 & 로케이션 엔진 (Warehouse Layout Engine)
* **문제점**: 창고마다 랙(Rack)의 단수(Level A/B 2단 vs 3~5단), 통로 개수, 바닥 적치 구역(Staging Floor)이 모두 다름.
* **해결 방안 (JSON Schema Driven Generator)**:
  - 창고 설정 스키마 정의 (`warehouse_configs`):
    ```json
    {
      "warehouse_id": "WH-SEOUL-01",
      "grid": { "rows": 12, "cols": 16 },
      "levels": ["A", "B"], // 2단 창고 (또는 ["A", "B", "C", "D"])
      "zones": [
        { "code": "A", "name": "Room Temp (상온)", "color": "#10b981" },
        { "code": "F", "name": "Frozen (냉동)", "color": "#0ea5e9" },
        { "code": "S", "name": "Staging (바닥적치)", "color": "#f59e0b" }
      ],
      "location_code_format": "LOC-{ZONE}{AISLE:02}{RACK:02}{LEVEL}{BIN:02}"
    }
    ```
  - **위 설정 저장 시 로케이션 자동 일괄 생성(Seed RPC)**을 실행하여 즉시 2D 맵과 바코드를 렌더링.

### ② 동적 존(Zone) 및 온도대 유연화
* 기존 고정 'A'(상온), 'F'(냉동) 열거형(Enum)을 **동적 테이블(`warehouse_zones`)** 기반으로 추상화.
* 의약품 창고의 `COLD_CHAIN`(2~8℃), 화학물질 창고의 `HAZARDOUS`(위험물), 보세 창고의 `BONDED` 등 자유롭게 정의.

### ③ 유연한 바코드 파서 엔진 (Barcode Rule Engine)
* **문제점**: A사는 단순 SKU(`CND-001`), B사는 GS1-128(`(01)08801...(17)261024(10)LOT123`), C사는 13자리 EAN-13을 사용.
* **해결 방안**:
  - 테넌트별 바코드 정규식(Regex) 파서 룰 테이블 제공:
    ```json
    {
      "parser_type": "GS1_COMPLEX",
      "regex": "^01(?<gtin>\\d{14})17(?<exp>\\d{6})10(?<lot>[a-zA-Z0-9]+)$",
      "actions": ["EXTRACT_SKU", "EXTRACT_EXPIRATION", "EXTRACT_LOT"]
    }
    ```
  - 모바일 앱 스캐너(`camera-scanner.tsx`)는 스캔 즉시 테넌트 룰에 맞춰 SKU, 유통기한, 로트 번호를 분리 파싱.

### ④ 다중 패키징 및 UOM 단위 변환 매트릭스
* 상품 판매 단위(`EA`), 박스 단위(`BOX`), 번들(`PACK`), 중량(`KG`), 부피(`L`) 변환 공식 등록.
* 예: 1 BOX = 24 EA, 1 PALLET = 40 BOX.
* 발주(OrderApp)는 BOX 단위로, 현장 피킹(Mobile)은 EA 또는 BOX 혼합 피킹을 자동 지시.

### ⑤ 자율 적응형 재고 정책 (FIFO vs FEFO & Dynamic ROP)
* **모드 스위치**:
  - `PERISHABLE_MODE = TRUE`: 유통기한 기반 **FEFO(선석출)** 및 유통기한 캡 적용 자동 임계치 가동.
  - `PERISHABLE_MODE = FALSE`: 입고일 기준 **FIFO(선입선출)** 및 단순 소진 속도 기반 임계치 가동.
* 최근 30일 출고 데이터를 바탕으로 품목별 안전재고($SS$)와 재주문점($ROP$)을 야간 배치로 자동 계산하여 결품을 원천 차단.

---

## 4. 신규 창고/기업 5단계 온보딩 플레이북 (Onboarding Playbook)

```
[1. 테넌트 등록] ──> [2. 창고 맵 빌더] ──> [3. 데이터 마이그레이션] ──> [4. 디바이스 배포] ──> [5. OrderApp 오픈]
 (브랜딩·통화)        (구획·로케이션)          (품목·단가·공급사)            (PIN·라벨인쇄)         (가맹점 발주 개시)
```

### Step 1: 테넌트 프로필 및 브랜딩 설정
1. 회사명, 사업자 번호, 로고 이미지 업로드
2. 기본 통화(USD, KRW, JPY, EUR 등) 및 세금 정책(부가세율, 면세 품목) 설정
3. 테마 컬러 및 송장(Invoice/Packing Slip) 헤더 양식 지정

### Step 2: 창고 로케이션 맵 빌더 (2D Visual Configurator)
1. 창고 가로/세로 그리드 규격 입력
2. 상온 존, 냉동/냉장 존, 스테이징 바닥 구역 드래그 배치
3. `Generate Locations` 클릭 $\rightarrow$ 100~1,000개 로케이션 코드 및 바코드 자동 생성

### Step 3: 데이터 마이그레이션 (Excel / CSV)
* 기본 제공 표준 엑셀 템플릿(`docs/items_import_template.csv`) 다운로드:
  - 품목(SKU, 품목명, 영문/국문명, 규격 Description, 바코드, 단가, 리드타임, UOM)
  - 파트너(공급처, 제조사, 배송 매장)
* 업로드 시 자동 유효성 검사 및 일괄 DB 삽입.

### Step 4: 현장 디바이스 배포 및 라벨 인쇄
1. **[Master > Labels]** 메뉴에서 랙 선반용 2단 바코드 라벨 및 스테이징 바닥 라벨 원클릭 일괄 인쇄.
2. 현장 작업자 계정 등록 (작업자별 4자리 간편 로그인 PIN 발급).
3. 현장 PDA 또는 스마트폰에서 모바일 웹 URL 접속 후 `홈 화면에 추가 (PWA 설치)`.

### Step 5: 가맹점 OrderApp 연동
1. 가맹점/매장 계정 등록 및 담당 배송지 주소 매핑.
2. OrderApp 접속 계정 전달 $\rightarrow$ 모바일/PC에서 실시간 재고 확인 및 장바구니 발주 개시.

---

## 5. 솔루션 상품화(SaaS)를 위한 개발 표준 및 보안 가이드

### ① 멀티테넌트 데이터 격리 (Row-Level Security, RLS)
모든 핵심 테이블(`items`, `locations`, `inventory`, `orders`, `order_items`, `partners`)은 `client_id (또는 tenant_id)`를 필수로 보유하며, Supabase RLS를 통해 타사 데이터 조회를 원천 차단합니다:
```sql
CREATE POLICY "Tenant Isolation Policy" ON public.inventory
FOR ALL USING (
  client_id = auth.jwt() ->> 'client_id'::uuid
  OR auth.jwt() ->> 'role' = 'service_role'
);
```

### ② API & 웹훅 확장성 (Integration Hooks)
타사 기존 ERP(SAP, 영림원, 더존) 또는 쇼핑몰(스마트스토어, 쿠팡, 쇼피파이)과 연동할 수 있는 RESTful 표준 웹훅 인터페이스 제공:
* `POST /api/v1/inbound`: 외부 발주서(PO) 입고 예정 데이터 수신
* `POST /api/v1/orders`: 외부 주문 인입 및 즉시 가용재고 소프트 할당
* `WEBHOOK outbound_completed`: 패킹 및 출고 완료 시 송장 번호와 함께 외부 시스템 콜백

---

## 6. 요약 및 기대 가치

* **비용 절감**: 신규 창고 오픈 시 SI(외주 개발) 비용 없이 1~2일 내 물류 시스템 즉시 가동.
* **표준화**: 소규모 창고부터 대형 풀필먼트 센터까지 공통의 Best Practice 물류 라이프사이클(FEFO, FEFO 피킹, 동적 임계치, 무선 검수) 적용.
* **사업 확장성**: WMS 단독 납품뿐만 아니라, 프랜차이즈 본사 대상 `OrderApp + WMS + G-Manager` 일체형 SCM 솔루션으로 패키징 판매 가능.
