# 📋 Phase 2: High-Quality UX & 첨단 물류 엔진 고도화 상세 개발 명세서
> **문서 대상**: `WMS Web-App`, `WMS Mobile-App`, `OrderAPP`, `G-Manager`  
> **문서 버전**: v1.0.0  
> **기준 마스터 플랜**: [`docs/SaaS_Productization_Master_Plan.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Productization_Master_Plan.md)  
> **선행 조건**: [`docs/SaaS_Phase1_Implementation_Spec.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Phase1_Implementation_Spec.md) (Phase 1 멀티테넌트 코어 완료)  
> **작성 일자**: 2026-11-01  
> **목표 기간**: 총 6주 (주차별 세부 구현)

---

## 1. 개요 및 엔지니어링 목표 (Objectives)

Phase 2는 멀티테넌시 코어(Phase 1) 위에 **대기업 솔루션(SAP, WMS 전문 패키지) 수준의 차별화된 고부가가치 UX 및 첨단 물류 엔진을 구축**하여, 신규 도입 기업들이 도입 즉시 감탄하고 높은 월 구독료(월 69만~250만원)를 기꺼이 지불하게 만드는 것을 목표로 합니다.

### 🎯 4대 핵심 개발 축
1. **[Web-App] 2D 비주얼 창고 스튜디오 (Drag & Drop Warehouse Builder)**: 마우스로 랙과 통로를 배치하면 로케이션과 라벨이 자동 생성되는 캔버스.
2. **[Mobile-App] 오프라인 우선 (Offline-First) & 산업용 스캐너 가속기**: 냉동고/Wi-Fi 음영지역에서도 100% 무중단 스캔 & IndexedDB 로컬 큐잉.
3. **[OrderAPP] 거래처별 차등 등급 단가 & 여신(Credit Limit) 한도 통제 엔진**: 채권 회수 리스크를 차단하는 지능형 발주 포털.
4. **[Engine] 동적 파동 피킹 (Wave Picking) & 멀티 오더 카트 분배 (Pick-to-Tote)**: 현장 피킹 동선을 60% 단축하는 최적화 알고리즘.

---

## 2. 주차별 상세 구현 로드맵 (6-Week Schedule)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Week 1-2: [Web-App] 2D 인터랙티브 창고 스튜디오 & 바코드 자동 생성 엔진│
├────────────────────────────────────────────────────────────────────────┤
│ Week 3:   [Mobile-App] 오프라인 우선(Offline-First) IndexedDB 동기화   │
├────────────────────────────────────────────────────────────────────────┤
│ Week 4:   [Mobile-App] 산업용 PDA SDK(Zebra DataWedge) & TSP 최단 경로 │
├────────────────────────────────────────────────────────────────────────┤
│ Week 5:   [OrderAPP] 거래처 차등 단가표 & 여신 한도(Credit Limit) 엔진 │
├────────────────────────────────────────────────────────────────────────┤
│ Week 6:   [Engine] 동적 파동 출고(Wave Picking) & 다중 카트 피킹 검증  │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 📅 Week 1-2: 2D 비주얼 창고 스튜디오 (Drag & Drop Warehouse Builder)

#### [Task 2.1] 2D 레이아웃 에디터 캔버스 (`/master/warehouse-studio`)
* **기술 스택**: HTML5 Canvas / Konva.js (또는 React Flow) 기반 2D 그리드 에디터.
* **주요 기능**:
  * 창고 가로/세로 실측 크기(M단위) 설정 및 격자(Grid) 스냅.
  * 좌측 도구 팔레트: `입고 도크(Dock)`, `출고 패킹존(Packing)`, `통로(Aisle)`, `보관 랙(Rack)`, `저온 구역(Cold Zone)`, `벽/기둥(Obstacle)`.
  * 랙 드래그 배치 후 속성 패널: 구역명(Zone), 랙 번호, 단수(1~5단), 칸수(1~4칸), 온도대(상온/냉장/냉동) 지정.
  * 회전, 복사/붙여넣기, 다중 선택 및 정렬 도구 지원.

#### [Task 2.2] 로케이션 DDL 확장 및 레이아웃 직렬화
```sql
-- locations 테이블에 2D 좌표 정보 확장
ALTER TABLE public.locations
ADD COLUMN IF NOT EXISTS pos_x NUMERIC(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pos_y NUMERIC(8,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rotation INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS temperature_zone VARCHAR(20) DEFAULT 'ROOM'; -- ROOM, CHILLED, FROZEN

-- 창고 도면 메타데이터 저장
CREATE TABLE IF NOT EXISTS public.warehouse_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(100) NOT NULL,
    grid_width INT DEFAULT 50,
    grid_height INT DEFAULT 30,
    layout_data JSONB NOT NULL, -- 캔버스 노드 및 연결선 직렬화 데이터
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### [Task 2.3] 1클릭 로케이션 바코드 & 랙 라벨 일괄 출력
* **[빌드 완료] 클릭 시**: 캔버스에 배치된 모든 랙의 좌표 데이터를 바탕으로 `locations` 테이블에 표준 규격 바코드(`LOC-A0105B01`)를 1초 만에 자동 생성.
* **[라벨 인쇄]**: A4 및 롤 라벨 프린터 규격의 QR/Code128 바코드 스티커 PDF 원클릭 렌더링.

---

### 📅 Week 3: WMS Mobile 오프라인 우선 (Offline-First) 동기화

#### [Task 3.1] IndexedDB 로컬 데이터 레이어 (`mobile-app/src/offline/`)
* **동작 원리**: 네트워크 단절 시에도 현장 작업(피킹, 실사, 로케이션 스캔)이 100% 정상 작동하도록 로컬 브라우저/웹뷰 DB에 트랜잭션 적재.
* **아키텍처**:
  * `Dexie.js` 기반 로컬 스토리지 구축: `cached_items`, `cached_locations`, `pending_transactions`.
  * 출고/실사 작업 시작 전 당일 할당 데이터(Order Items, Bin Inventory)를 모바일 로컬로 프리패칭(Pre-fetch).

```ts
// mobile-app/src/offline/db.ts
import Dexie, { Table } from 'dexie';

export interface PendingAction {
  id?: number;
  tenantId: string;
  actionType: 'PICK' | 'COUNT' | 'TRANSFER';
  payload: any;
  timestamp: number;
  synced: boolean;
}

export class OfflineWarehouseDB extends Dexie {
  pendingActions!: Table<PendingAction, number>;

  constructor() {
    super('OfflineWarehouseDB');
    this.version(1).stores({
      pendingActions: '++id, tenantId, actionType, timestamp, synced'
    });
  }
}
```

#### [Task 3.2] 백그라운드 재연결 동기화 워커 (Sync Worker)
* 네트워크가 복원되는 즉시(`window.addEventListener('online')` 감지) 로컬 큐에 쌓인 `pendingActions`를 시간 순(FIFO)으로 백엔드 RPC(`sync_offline_actions`)에 전송.
* 동시 충돌(Conflict) 발생 시 서버 원장 기준으로 자동 조정(Auto-reconciliation) 및 작업자 피드백.

---

### 📅 Week 4: 산업용 스캐너 SDK 탑재 & TSP 최단 피킹 경로

#### [Task 4.1] Zebra DataWedge & 산업용 PDA 하드웨어 스캐너 SDK
* 카메라 스캔의 지연(500ms~1초)을 극복하고, 현장 레이저 스캐너의 50ms 초고속 반응성 구현.
* **연동 대상**: Zebra TC21/TC26 (DataWedge Intent 브로드캐스트), PointMobile, Honeywell Android PDA.
* Android WebView 상에서 네이티브 자바스크립트 인터페이스(`window.DataWedgeListener`) 바인딩.

#### [Task 4.2] 2D 좌표 기반 TSP 최단 피킹 경로 알고리즘
* 피커가 할당받은 30개 품목의 위치(Week 1에서 저장된 `pos_x`, `pos_y`)를 순회외판원문제(TSP) 휴리스틱(S-Shape / Nearest Neighbor) 알고리즘으로 계산.
* 피킹 화면에 **"다음 목표: A02 랙 2단 (전방 4m)"** 안내 화살표 및 최단 경로 지시.

---

### 📅 Week 5: OrderAPP 차등 등급 단가 & 여신(Credit Limit) 엔진

#### [Task 5.1] 거래처별 차등 단가표 스키마
```sql
-- 가맹점/바이어별 등급 및 여신 한도
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS price_tier VARCHAR(20) DEFAULT 'STANDARD', -- VIP, WHOLESALE, STANDARD
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) DEFAULT 0,      -- 여신(외상) 허용 한도
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(12,2) DEFAULT 0; -- 현재 미수금 누적액

-- 등급별/거래처별 특수 단가표
CREATE TABLE IF NOT EXISTS public.store_item_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.stores(id),
    price_tier VARCHAR(20), -- store_id가 없으면 등급 전체 적용
    item_id UUID REFERENCES public.items(id) ON DELETE CASCADE,
    custom_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, store_id, price_tier, item_id)
);
```

#### [Task 5.2] 발주몰(OrderAPP) 여신 한도 차단 로직 (`/api/order`)
* 가맹점 발주 인입 시:
  $$\text{발주금액} + \text{현재 미수금} > \text{여신 한도}$$
  초과 시 즉시 주문 승인을 차단하고 **"외상 한도(300만원)를 초과하여 발주가 제한되었습니다. 본사에 문의 바랍니다."** 안내 다이얼로그 출력.
* 정상 범위 내 발주일 경우 `stores.outstanding_balance` 자동 증액.

---

### 📅 Week 6: 동적 파동 출고 (Wave Picking) & 다중 카트 피킹 (Pick-to-Tote)

#### [Task 6.1] 파동 출고(Wave Picking) 플래너
* **알고리즘**: 인입된 주문 200건을 다음 조건으로 자동 군집화:
  1. 배송 권역 (Zone A: 서울 강남, Zone B: 경기 판교 등)
  2. 보관 온도대 (냉장 전용 웨이브, 상온 전용 웨이브)
  3. 단일 품목 대량 발주(Single-line Order) 분리 처리
* 파동 주문서 확정 시, 여러 매장의 품목을 묶어서 총 소요량을 일괄 피킹하는 지시서 생성.

#### [Task 6.2] 다중 오더 카트 분배 피킹 (Pick-to-Tote UI)
* 모바일 PDA 화면에 4분할/6분할 토트 바구니 그래픽 표출:
  * 바코드 스캔: `Buldak 라면 Multi 5pk`
  * 화면 지시: **[토트 1(서초점): 2개]**, **[토트 3(역삼점): 1개]** 표시 및 담은 후 토트 바코드 검증 스캔.
* 피킹과 동시에 매장별 분류(Sorting)가 완료되어 출고 검수 시간 70% 단축.

---

## 3. Phase 2 검증 및 인도 기준 (Acceptance Criteria)

1. [ ] **2D 맵 빌더**: 캔버스에서 랙 30개를 마우스로 배치하고 [저장] 클릭 시 120개 로케이션이 즉시 DB에 생성되는가?
2. [ ] **오프라인 모바일**: Wi-Fi를 끄고 비행기 모드 상태에서 피킹 10건을 완료한 뒤, Wi-Fi를 켰을 때 데이터 손실 없이 서버에 100% 동기화되는가?
3. [ ] **여신 한도 차단**: 미수금 250만원인 가맹점이 100만원 발주 제출 시(한도 300만원), 주문이 거부되고 경고창이 뜨는가?
4. [ ] **동적 파동 피킹**: 50개 주문을 1개 웨이브로 묶었을 때 피커의 총 이동 거리가 개별 피킹 대비 50% 이상 감소하는가?
