# 🧪 WMS B2B SaaS 엔드투엔드(E2E) 전체 기능 검증 및 테스트 가이드
> **문서 대상**: QA 엔지니어, 프로덕트 매니저(PO), 솔루션 아키텍트, 고객사 관리자  
> **시스템 환경**: `WMS Web-App` (Next.js 16 + Supabase Multi-Tenant SaaS)  
> **기준 버전**: v0.1.4 (Phase 1 ~ Phase 4 전 단계 통합본)  
> **작성 일자**: 2026-11-05  

---

## 1. 테스트 준비 및 환경 세팅 (Prerequisites)

### 1.1 로컬 개발 서버 기동
로컬 머신 터미널에서 아래 명령을 실행하여 개발 서버를 시작합니다.
```bash
# web-app 디렉토리 진입 및 서버 실행 (Port 3000)
cd web-app
pnpm run dev
```
- 브라우저 접속 주소: `http://localhost:3000`

### 1.2 테스트 기본 계정 및 인증 정보
| 역할 (Role) | 테스트 계정 이메일 | 초기 비밀번호 | 접근 가능 주요 권한 |
| :--- | :--- | :--- | :--- |
| **전사 관리자 (ADMIN)** | `admin@glife.com` (또는 사용자 계정) | (설정된 비밀번호) | 전체 콘솔, 시스템 설정, 빌링, 사용자 승격 |
| **창고 관리자 (SUPERVISOR)** | `supervisor@glife.com` | (설정된 비밀번호) | 재고 조정, 발주 승인, 3PL 정산, 로케이션 구조 변경 |
| **현장 작업자 (WORKER)** | `worker1@glife.com` | (설정된 비밀번호) | 입고 검수, 피킹, 번들 해체, 로케이션 바코드 스캔 |
| **공급사 파트너 (VENDOR)** | `vendor@samyang.com` | (설정된 비밀번호) | 공급사 위탁 재고 포털 (`/vendor/vmi`), ASN 등록 |

### 1.3 Open REST API 테스트 인증 키
- **Demo API Key**: `wms_live_demo_glife_secret`
- **테넌트 코드**: `glife` (기본 테넌트) / `acme` (2호 격리 테넌트)

---

## 2. 9대 영역별 상세 테스트 시나리오 목록 (Full Test Matrix)

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. 인증, 권한 & 셀프 온보딩 마법사 (/login, /onboarding, /settings)   │
├────────────────────────────────────────────────────────────────────────┤
│ 2. 관제탑 & 재고 지능 대시보드 (/dashboard - 3대 탭)                  │
├────────────────────────────────────────────────────────────────────────┤
│ 3. 2D 창고 스튜디오 & 마스터 데이터 (/master/items, /master/locations) │
├────────────────────────────────────────────────────────────────────────┤
│ 4. 입고, 실시간 재고 & 번들 해체 (/inventory, /inventory/reports)      │
├────────────────────────────────────────────────────────────────────────┤
│ 5. 출고 주문, 인라인 편집 & 웨이브 피킹 (/orders, /orders/waves)       │
├────────────────────────────────────────────────────────────────────────┤
│ 6. 3PL 다중 화주 물류 정산 엔진 (/master/clients/billing)              │
├────────────────────────────────────────────────────────────────────────┤
│ 7. 공급사 위탁 재고 협업 포털 Vendor VMI (/vendor/vmi)                │
├────────────────────────────────────────────────────────────────────────┤
│ 8. Headless WMS Open REST API & Webhooks (/settings/developer, /api/v1)│
├────────────────────────────────────────────────────────────────────────┤
│ 9. SLA 99.9% 헬스체크 & 동시성 부하 테스트 (/api/health, scripts)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 📋 Test Suite 1: 인증, 권한 & 30분 셀프 온보딩

#### Case 1.1: 30분 셀프 온보딩 마법사 & 엑셀 대량 업로드
- **URL**: `http://localhost:3000/onboarding`
- **목적**: 신규 테넌트 기업이 30분 이내에 회사 정보 입력 및 엑셀 일괄 등록으로 창고를 구축할 수 있는지 검증.
- **테스트 절차**:
  1. `/onboarding` 페이지로 이동합니다.
  2. **Step 1 (회사 기본정보)**: 회사명(예: `(주)한국신선유통`), 테넌트 코드(`k-fresh`), 대표자명, 기본 통화(`KRW`) 입력 후 `다음 단계` 클릭.
  3. **Step 2 (창고 기본 구조)**: 상온(Zone A) 10-Bay, 냉장(Zone F) 10-Bay 선택 및 기본 슬롯 확인 후 `다음 단계` 클릭.
  4. **Step 3 (마스터 엑셀 일괄 임포트)**:
     - `docs/items_import_template (1).xlsx` 파일을 드래그 앤 드롭 또는 파일 선택으로 업로드.
     - 시트 파싱 결과(품목 수, 바코드, 안전재고) 미리보기 테이블 확인.
  5. `온보딩 완료 및 WMS 시작하기` 클릭.
- **기대 결과**:
  - `tenants` 및 `tenant_settings`에 신규 테넌트 레코드가 생성됨.
  - 엑셀 내 품목들이 해당 `tenant_id`로 안전하게 등록되며 메인 대시보드로 자동 리다이렉트됨.

#### Case 1.2: 사용자 계정 관리 & 역할(Role) 승격
- **URL**: `http://localhost:3000/settings/users`
- **목적**: 관리자가 직원의 권한을 `WORKER`에서 `MANAGER`, `SUPERVISOR`, `ADMIN`, `VENDOR`로 자유롭게 변경 가능한지 검증.
- **테스트 절차**:
  1. 관리자 계정으로 로그인 후 사이드바 `Settings > Users` 이동.
  2. 목록에서 특정 사용자 행의 `Role` 드롭다운 클릭.
  3. 역할을 `SUPERVISOR` 또는 `VENDOR`로 변경 선택.
- **기대 결과**:
  - 화면 상단에 "사용자 권한이 성공적으로 변경되었습니다" 토스트 알림 표시.
  - 페이지 새로고침 시 변경된 역할 뱃지가 유지됨.

#### Case 1.3: 테넌트 Row-Level Security (RLS) 데이터 격리 검증
- **검증 도구**: `scripts/test_rls_penetration.sql`
- **목적**: A 테넌트(Glife) 사용자가 B 테넌트(Acme)의 품목이나 재고를 조회/수정할 수 없도록 DB 레벨에서 원천 차단되는지 검증.
- **테스트 절차**:
  - Supabase SQL Editor에서 `scripts/test_rls_penetration.sql` 쿼리를 실행하거나 터미널에서 실행.
- **기대 결과**:
  - `TEST 1`: Glife 컨텍스트에서 Acme 전용 품목 조회 시 **0건 반환 (정보 은닉)**.
  - `TEST 2`: Glife 컨텍스트에서 Acme 재고 강제 수정(`UPDATE`) 시 **0건 반영 (변조 차단)**.
  - RLS 통과율 100% (6/6 Scenarios Passed).

---

### 📋 Test Suite 2: 관제탑 & 재고 지능 대시보드 (Dashboard)

#### Case 2.1: 메인 운영 현황 탭 (Operations)
- **URL**: `http://localhost:3000/dashboard`
- **테스트 절차**:
  1. 상단 멀티 창고 셀렉터에서 `전체 센터`, `김포 메인센터`, `용인 저온센터`를 순차 변경.
  2. 반원형(180도) `DockToStockGauge` 게이지가 목표 30분 기준 현재 소요시간(분)과 진행률을 부드러운 애니메이션으로 표시하는지 확인.
  3. 5대 공정 카드(입고 하역, 스마트 적치, 오더 피킹, 패킹 검수, 순환 재고 실사)의 진행률과 SLA 지표 확인.
- **기대 결과**:
  - 창고 변경 시 URL SearchParams(`?warehouse=...`)가 동기화되며 해당 센터 데이터로 리프레시됨.

#### Case 2.2: 재고 지능 탭 (Inventory Intelligence)
- **URL**: `http://localhost:3000/dashboard?tab=inventory`
- **테스트 절차**:
  1. 상단 탭에서 `Inventory Intelligence` 클릭.
  2. **Dead Stock (체화 재고 카드)**: 60일 이상 무이동 품목 목록 및 체류 금액 합계 확인.
  3. **Smart Reorder (결품 방지 추천)**: 현재고 < 안전재고인 품목 목록 및 `[1-Click 발주 생성]` 버튼 확인.
  4. **Dynamic Slotting (동적 슬로팅)**: 회전율이 높은 상온 품목이 3층에 있을 때 1층(Level A 골든존)으로 전진 배치하라는 슬로팅 제안 카드 확인.
- **기대 결과**:
  - 실시간 DB 쿼리 기반 데이터가 즉시 바인딩되며 추천 액션 버튼이 활성화됨.

#### Case 2.3: 2D 디지털 플로어 맵 & 랙 입면도 (Warehouse Map)
- **URL**: `http://localhost:3000/dashboard?tab=warehouse-map`
- **테스트 절차**:
  1. `2D Layout Map` 탭 클릭.
  2. 상온(Zone A), 냉동(Zone F) 구역별 통로 및 10개 Bay 그리드 확인.
  3. `S-Shape 피킹 동선` 토글 스위치를 On/Off 하여 최적 피킹 경로 오버레이 확인.
  4. 특정 Bay의 `[입면도 보기]` 클릭 ➔ 4단 수직 랙 다이얼로그(`RackElevationView`) 오픈.
  5. 특정 슬롯 클릭 ➔ `BinAssignModal`에서 상품 배정 및 수량 수정 테스트.
- **기대 결과**:
  - 슬롯 점유율 히트맵(녹색/노랑/빨강)이 정상 표시되고, 입면도에서 슬롯별 SKU 상세가 정확히 노출됨.

---

### 📋 Test Suite 3: 2D 비주얼 창고 스튜디오 & 마스터 관리

#### Case 3.1: 2D 비주얼 창고 스튜디오 (Drag & Drop Canvas)
- **URL**: `http://localhost:3000/master/warehouse-studio`
- **테스트 절차**:
  1. 좌측 툴바에서 `상온 랙(Dry Rack)`, `냉동 랙(Frozen Rack)`, `입고 하역장(Inbound Dock)` 블록 선택.
  2. 캔버스 영역에 드래그하여 배치하고 회전/크기 조절.
  3. 우측 속성 패널에서 통로 번호(Aisle), 베이(Bay), 단수(Levels) 설정.
  4. 상단 `[바코드 라벨 일괄 생성 PDF]` 버튼 클릭.
- **기대 결과**:
  - 배치된 랙 좌표를 기반으로 `LOC-ZoneAisleBayLevelBin` 규격의 2단 바코드 라벨 인쇄 뷰가 정상 생성됨.

#### Case 3.2: 창고 로케이션 동적 구조 설정 (120개 랙 프리셋)
- **URL**: `http://localhost:3000/master/locations`
- **테스트 절차**:
  1. 우측 상단 `[창고 구조 설정 (Configure Structure)]` 버튼 클릭.
  2. 모달에서 `Aisles: 1`, `Bays: 10`, `Levels: 3`, `Bins per Tier: 2` 입력 (총 120개 슬롯 프리셋).
  3. `구조 적용 및 슬롯 동기화` 클릭.
- **기대 결과**:
  - 로케이션 테이블에 Zone A 60개, Zone F 60개 등 총 120개 로케이션이 즉시 갱신되어 목록에 표시됨.

#### Case 3.3: 번들 해체 (De-kitting) 규칙 설정
- **URL**: `http://localhost:3000/master/conversions`
- **테스트 절차**:
  1. `[신규 해체 규칙 등록]` 클릭.
  2. 부모 품목: 박스 상품 선택 (예: `신라면 30입 BOX`).
  3. 자식 품목: 낱개 상품 선택 (예: `신라면 낱개 EA`).
  4. 환산 배율: `30` 입력, 자동 해체: `활성화` 체크 후 저장.
- **기대 결과**:
  - 해체 규칙 목록에 추가되고, 추후 주문 인입 시 낱개 재고 부족 시 자동으로 박스가 해체되는 정책이 등록됨.

---

### 📋 Test Suite 4: 입고, 실시간 재고 & 재고 변동 리포트

#### Case 4.1: 실시간 재고 조회 및 유통기한 FEFO 확인
- **URL**: `http://localhost:3000/inventory`
- **테스트 절차**:
  1. 재고 목록에서 특정 품목의 `가용 재고(Available)`, `할당 재고(Allocated)`, `보관 로케이션` 확인.
  2. 유통기한 컬럼의 FEFO 경보 뱃지(D-30 이내 주황색, 만료 빨간색) 표시 확인.
  3. 품목 행 클릭 ➔ 로케이션별 분산 재고 및 LOT 번호 상세 확인.
- **기대 결과**:
  - 실시간 재고 수량이 정확히 표출되며, 유통기한이 가장 짧은 재고부터 선출고 대기 상태로 분류됨.

#### Case 4.2: 수기 재고 조정 & 감사 사유 기록
- **URL**: `http://localhost:3000/inventory`
- **테스트 절차**:
  1. 특정 품목 우측 `[조정]` 버튼 클릭.
  2. 조정 유형: `실사 차이(COUNT_DISCREPANCY)` 또는 `파손(DAMAGED)` 선택.
  3. 증감 수량(예: `-2`) 및 사유(예: `하역 도중 박스 파손 확인`) 입력 후 확인.
- **기대 결과**:
  - 즉시 가용 재고가 2개 차감 반영됨.
  - `/settings/audit-logs` 감사 로그에 조정자, 변경 전후 수량, 사유가 영구 기록됨.

#### Case 4.3: 재고 변동 이력 리포트
- **URL**: `http://localhost:3000/inventory/reports`
- **테스트 절차**:
  1. 입출고 트랜잭션 원장 테이블 확인.
  2. 작업 유형(`RECEIVING`, `PICKING`, `ADJUSTMENT`, `DEKIT`) 필터링 적용.
  3. `[엑셀/CSV 다운로드]` 클릭.
- **기대 결과**:
  - 선택한 기간/유형별 수불 이력이 정확한 CSV 파일로 다운로드됨.

---

### 📋 Test Suite 5: 출고 주문, 인라인 편집 & 웨이브 피킹

#### Case 5.1: 주문 상세 인라인 편집 (OrderDetailsDialog)
- **URL**: `http://localhost:3000/orders`
- **테스트 절차**:
  1. 대기 중인 주문 1건을 클릭하여 상세 다이얼로그 오픈.
  2. 주문 품목의 UOM을 `BOX`에서 `EA`로 변경 ➔ 단가가 낱개 단가로 자동 매핑되는지 확인.
  3. 수량을 `5`에서 `10`으로 인라인 수정 ➔ 총 주문액 및 소계가 실시간 재계산되는지 확인.
  4. 하단 `[품목 추가]`를 눌러 새로운 SKU 검색 후 주문 라인에 추가.
  5. `인보이스 발행일(Invoice Date)` 카드에서 날짜를 오늘 또는 특정일로 지정 후 `저장` 클릭.
- **기대 결과**:
  - 토스트 알림과 함께 주문 품목, 수량, UOM, 인보이스 날짜가 완벽히 저장되고 목록 총액과 일치함.

#### Case 5.2: 주문 삭제 및 안전 차단
- **URL**: `http://localhost:3000/orders`
- **테스트 절차**:
  1. 대기 상태 주문 우측의 쓰레기통(`Trash2`) 아이콘 클릭.
  2. 안전 확인 다이얼로그에서 `주문 삭제` 확인 클릭.
- **기대 결과**:
  - 주문 및 연계된 `order_items`가 즉시 삭제되고 목록에서 제거됨.
  - 이미 출고 완료(Fulfilled)된 주문은 삭제 버튼이 비활성화되거나 차단됨.

#### Case 5.3: 동적 웨이브 피킹 (Wave & Batch Picking)
- **URL**: `http://localhost:3000/orders/waves`
- **테스트 절차**:
  1. `[신규 웨이브 배치 생성]` 클릭.
  2. 묶음 기준 선택: `배송 권역별 (Zone)` 또는 `온도대별 (Cold/Dry)`.
  3. 대기 중인 주문 5건 체크 후 `웨이브 확정 및 토트 바구니 할당` 클릭.
- **기대 결과**:
  - 여러 주문의 동일 품목이 1회 통합 피킹 리스트로 합산되고, 피커 대차의 각 바구니(Tote A, B, C...)로 분배 지시(Pick-to-Tote)가 자동 분할 생성됨.

---

### 📋 Test Suite 6: 3PL 다중 화주 물류비 정산 엔진

#### Case 6.1: 3PL 화주사 물류비 대시보드
- **URL**: `http://localhost:3000/master/clients/billing`
- **테스트 절차**:
  1. 상단 4대 KPI 요약 카드 확인:
     - 총 위탁 화주사 수
     - 당월 누적 보관료 (파렛트/CBM)
     - 당월 누적 작업비 (입고 하역/피킹/패킹)
     - 총 정산 청구 예정액
  2. 화주사별 테이블(Food Depot, Cosmetics Co 등)에서 평균 점유 파렛트 수 및 보관료/작업비 확인.
- **기대 결과**:
  - 계약된 요율에 따른 실데이터 정산 스냅샷이 오차 없이 표출됨.

#### Case 6.2: 3PL 요율 계약 인라인 수정
- **URL**: `http://localhost:3000/master/clients/billing`
- **테스트 절차**:
  1. 특정 화주사 우측 `[요율 설정 (Rates)]` 클릭.
  2. 파렛트당 일일 보관료(예: `800원` ➔ `850원`), 피킹 건당 피(예: `100원` ➔ `120원`) 수정 후 저장.
- **기대 결과**:
  - "3PL 요율 계약이 갱신되었습니다" 토스트 알림 및 변경 수치 즉시 반영.

#### Case 6.3: 일별 정산 명세 확인 및 CSV 다운로드
- **URL**: `http://localhost:3000/master/clients/billing`
- **테스트 절차**:
  1. 특정 화주사 우측 `[일별 상세 내역]` 클릭.
  2. 1일부터 말일까지의 일별 파렛트 수, 보관료, 작업량, 일일 합계 테이블 확인.
  3. 상단 `[정산 명세서 CSV 다운로드]` 클릭.
- **기대 결과**:
  - 화주사 정산용 일별 상세 내역이 포함된 CSV 파일이 다운로드됨.

---

### 📋 Test Suite 7: 공급사 위탁 재고 협업 포털 (Vendor VMI)

#### Case 7.1: 공급사 위탁 재고 대시보드 및 품절 D-Day 경보
- **URL**: `http://localhost:3000/vendor/vmi`
- **테스트 절차**:
  1. 상단 공급사 셀렉터에서 특정 공급업체(예: `(주)삼양식품`) 선택.
  2. 4대 KPI 카드 확인:
     - 위탁 공급 품목수
     - 창고 가용 재고 총합
     - 보충 권고/위험 품목수
     - 입고 진행 중 ASN 수
  3. `실시간 재고 & 소진율 분석` 탭에서 SKU별 안전재고 대비 소진율(%) 프로그레스 바 확인.
  4. 최근 30일 출고 속도 기반의 **품절 예상 일자(Runout Date, D-Day)** 경보 뱃지(예: `D-3 위험`) 확인.
- **기대 결과**:
  - 공급사가 자기 상품의 재고만 투명하게 확인하고 보충 필요성을 직관적으로 파악할 수 있음.

#### Case 7.2: 사전 입고 예정 통지 (ASN) 신규 제출
- **URL**: `http://localhost:3000/vendor/vmi`
- **테스트 절차**:
  1. `사전 입고 예정(ASN) 관리` 탭 클릭.
  2. `[신규 사전 입고 등록 (Create ASN)]` 버튼 클릭.
  3. 입고 예정일(내일 일자), 운송사명(예: `CJ대한통운`), 송장 번호 입력.
  4. 납품할 품목 및 예정 수량(예: 100 BOX), LOT 번호, 유통기한 입력 후 저장.
- **기대 결과**:
  - ASN 상태가 `PLANNED(예정)`으로 등록되며 WMS 입고 대기열에 즉시 반영됨.

---

### 📋 Test Suite 8: Headless WMS Open REST API & Webhooks

#### Case 8.1: 개발자 콘솔 (API Key 발급 & Webhook 테스트)
- **URL**: `http://localhost:3000/settings/developer`
- **테스트 절차**:
  1. 사이드바 `Settings > Developer & Open API` 이동.
  2. `[신규 API 키 발급]` 클릭 ➔ 키 이름(예: `SAP ERP 연동용`) 입력 후 발급.
  3. 1회성으로 노출되는 비밀키(`wms_live_...`) 복사.
  4. 웹훅 섹션에서 `[엔드포인트 등록]` ➔ 수신 URL(`https://httpbin.org/post` 등) 및 구독 이벤트(`order.created`, `order.fulfilled`) 선택 후 저장.
  5. `[Ping 테스트]` 버튼 클릭.
- **기대 결과**:
  - HMAC-SHA256(`X-WMS-Signature`) 서명이 첨부된 테스트 페이로드가 정상 발송되고 응답 코드(200 OK)가 표시됨.

#### Case 8.2: Open REST API cURL 호출 검증

##### 1) 실시간 가용 재고 조회 API
```bash
curl -X GET "http://localhost:3000/api/v1/inventory?sku=SKU-BULK-001" \
  -H "Authorization: Bearer wms_live_demo_glife_secret"
```
- **기대 응답 (200 OK)**:
```json
{
  "items": [
    {
      "sku": "SKU-BULK-001",
      "name": "CJ 고메 냉동 만두 1kg",
      "availableQty": 120,
      "allocatedQty": 15,
      "locations": ["LOC-F0101A01", "LOC-F0101A02"]
    }
  ],
  "totalCount": 1
}
```

##### 2) 외부 발주 신규 인입 API
```bash
curl -X POST "http://localhost:3000/api/v1/orders" \
  -H "Authorization: Bearer wms_live_demo_glife_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "ORD-API-TEST-001",
    "orderDate": "2026-11-06",
    "sourceType": "API_INTEGRATION",
    "items": [
      { "sku": "SKU-BULK-001", "quantity": 5, "uom": "BOX", "unitPrice": 15000 }
    ],
    "memo": "외부 쇼핑몰 자동 연동 테스트"
  }'
```
- **기대 응답 (201 Created)**:
```json
{
  "success": true,
  "orderNo": "ORD-API-TEST-001",
  "status": "PENDING",
  "message": "주문이 성공적으로 WMS에 인입되었습니다."
}
```

---

### 📋 Test Suite 9: SLA 99.9% 헬스체크 & 동시성 부하 테스트

#### Case 9.1: SLA 99.9% 헬스체크 모니터링 API
- **테스트 명령**:
```bash
curl -X GET "http://localhost:3000/api/health"
```
- **기대 응답 (200 OK)**:
```json
{
  "status": "HEALTHY",
  "service": "WMS-Enterprise-Core",
  "slaTarget": "99.90%",
  "version": "0.1.4",
  "uptimeSeconds": 1420,
  "timestamp": "2026-11-06T03:15:00.000Z",
  "checks": {
    "database": {
      "status": "UP",
      "latencyMs": 14
    },
    "system": {
      "memory": {
        "heapUsedMB": 68.45,
        "heapTotalMB": 112.3,
        "rssMB": 180.2
      },
      "nodeVersion": "v20.x.x",
      "platform": "win32"
    }
  }
}
```

#### Case 9.2: 원클릭 동시성 부하 테스트 러너 실행
- **목적**: 100개 가맹점 동시 발주(300 TPS) 및 30명 동시 피커 스캔 시 락 경합 없이 SLA 99.9%가 유지되는지 검증.
- **실행 명령 (PowerShell)**:
```powershell
# 개발 서버가 실행 중인 상태에서 별도 터미널에서 실행
powershell -ExecutionPolicy Bypass -File scripts/run-load-test.ps1 -DurationSeconds 15 -ConcurrentStores 50 -ConcurrentPda 30
```
- **기대 결과**:
```text
===============================================================
📊 Enterprise Load & High-Availability Test Report
===============================================================
Total Execution Time : 15.02s
Grand Total Requests : 3,840
Average Throughput   : 256 TPS (Requests / Sec)
SLA Success Rate     : 100.000% (Target: >= 99.90%)
---------------------------------------------------------------
▶ [POST /api/v1/orders (Burst Store Ingestion)]
  Requests    : Total 1,520 | OK 1,520 | Err 0 (100.00% success)
  Latency (ms): Avg 48.2ms | p95 110ms | p99 180ms

▶ [GET /api/v1/inventory (High-Speed PDA Scan)]
  Requests    : Total 2,290 | OK 2,290 | Err 0 (100.00% success)
  Latency (ms): Avg 24.1ms | p95 45ms | p99 78ms
===============================================================
🏆 RESULT: PASSED - SLA 99.9% High Availability Verified!
===============================================================
```

---

## 3. 검증 실패(Fail) 시 점검 체크리스트 (Troubleshooting)

1. **401 Unauthorized 에러 발생 시**:
   - `Authorization: Bearer <API_KEY>` 헤더에 올바른 API 키가 전달되었는지 확인합니다.
   - 키가 만료되었거나 비활성화된 경우 `/settings/developer`에서 신규 발급합니다.
2. **503 Service Unavailable (/api/health)**:
   - Supabase PostgreSQL 데이터베이스 연결 문자열(`.env.local`의 `NEXT_PUBLIC_SUPABASE_URL` 및 `SUPABASE_SERVICE_ROLE_KEY`)을 확인합니다.
3. **RLS 권한 오류 (데이터 미표시)**:
   - 사용자의 `tenant_id`가 세션 쿠키 또는 요청 컨텍스트에 정상 주입되었는지 확인합니다.
