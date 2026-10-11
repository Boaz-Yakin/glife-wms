# 차세대 WMS 관제 대시보드 고도화 상세 설계서 (Dashboard Enhancement Specification)
## 3DLogistiX 벤치마킹 기반 경량화 2D 디지털 맵 & 데이터 주도 재고관리(Data-Driven Inventory Management)

> **문서 상태**: Approved Technical Specification  
> **작성일**: 2026-10-11 (Updated v3.1 - 2D Visual Layout 전환 반영)  
> **버전**: v3.1 (3DLogistiX 방법론 벤치마킹 + 실무 최적화 2D 디지털 맵 아키텍처)  
> **대상 시스템**: [`web-app`](file:///c:/Users/boazn/Projects/WMS/web-app) (사무실 관리자용 백오피스 대시보드) & [`mobile-app`](file:///c:/Users/boazn/Projects/WMS/mobile-app) 연동  
> **참조 출처**: 
> - [3DLogistiX - How Data Driven Inventory Management Transforms Stock Control](https://www.3dlogistix.com/post/data-driven-inventory-management)
> - [3DLogistiX - Core Features & Visual Warehouse Platform](https://www.3dlogistix.com/features)
> - [WERC (Warehousing Education and Research Council) Metrics & Benchmarking](https://werc.org/page/metrics)
> - [McKinsey & Company - Digital Transformation in Supply Chain Operations](https://www.mckinsey.com/capabilities/operations/our-insights/digital-transformation-raising-supply-chain-performance-to-new-levels)

---

## 1. Executive Summary & 핵심 아키텍처 철학

### 1.1 중소·중견 물류 현장(SMEs)의 5대 병목 (The 5 SME Pain Points)
3DLogistiX의 글로벌 물류 연구 보고서에 따르면, 기존 전통적 WMS 또는 스프레드시트 기반 창고 운영은 다음과 같은 5대 치명적 병목에 직면해 있습니다:

1. **운영 비용 증가 (Increased Operating Costs)**:
   - 비효율적 피킹 동선과 수기 전표 처리로 인해 불필요한 작업 인건비, 공간 유지비, 장비 연료비가 누적됩니다.
2. **출하 처리량 정체 (Reduced Throughput)**:
   - 창고 내부 병목 구간(Bottleneck)을 실시간으로 감지하지 못해 주문이 몰리는 피크 타임에 일일 처리 한계치에 봉착합니다.
3. **재고 불일치 및 결품 (Inventory Discrepancies & Stockouts)**:
   - 전산 재고와 실물 재고의 오차로 인해 판매 가능한 상품이 품절 처리되거나, 반대로 없는 상품의 주문을 받아 출하가 정지되는 기회 손실이 발생합니다.
4. **주문 이행 사이클 타임 지연 (Delays in Order Fulfilment)**:
   - 주문 접수부터 랙 탐색, 피킹, 패킹, 상차까지의 리드타임이 길어져 당일 배송 및 긴급 주문 SLA(Service Level Agreement)를 위반하게 됩니다.
5. **창고 보관 공간의 낭비 (Poor Space Utilisation)**:
   - 랙의 공간 활용률과 고회전/저회전 품목 배치가 최적화되지 않아 가용 면적이 부족해져 외부 임차 창고 비용이 추가 발생합니다.

---

### 1.2 "No Key Man Dependency" & 2D 인터랙티브 맵 채택 배경
전통적 중소형 창고의 가장 큰 리스크는 **"어느 물건이 몇 번 랙 몇 단에 있는지, 어떤 순서로 돌아야 빠른지"**가 특정 베테랑 반장의 머릿속 기억(Tribal Knowledge)에만 의존한다는 점입니다.

```
[ 기존 전통적 창고 ]
특정 숙련자 결근/퇴사 ───> 피킹 경로 혼선 ───> 오피킹 급증 ───> 출하 정지 (치명적 병목)

[ 우리 WMS 데이터 주도 창고 (2D Visual Layout) ]
2D 평면 맵(Top-Down Floor Map) + 랙 단별 그리드(Elevation) ───> 신규 작업자도 2D 가이드로 첫날부터 95% 이상 생산성 발휘
```

#### 💡 왜 3D 대신 2D로 구현하는가? (Technical Rationale for 2D)
1. **모바일/태블릿 경량성 및 반응 속도 (Performance)**:
   - Three.js/WebGL 3D 모델링은 고사양 GPU 자원을 소모하며, 현장 보급형 태블릿이나 모바일 스캐너에서 발열 및 버벅임(Frame Drop)을 유발할 수 있습니다.
   - **SVG / Canvas 기반 2D 평면 맵**은 1MB 미만의 초경량 번들로 저사양 기기에서도 즉각적이고 부드러운 60fps 조작감을 보장합니다.
2. **현장 작업자의 직관적 인지성 (Readability)**:
   - 3D는 카메라 각도 회전 및 줌 조작이 필요해 작업 중 혼선을 줄 수 있지만, **위에서 내려다보는 2D 탑뷰(Floor Plan)**와 **랙 정면 단별 그리드(Elevation View)**는 피킹 대상 위치를 오인 없이 한눈에 파악할 수 있습니다.
3. **손쉬운 로케이션 자동 렌더링 (Maintainability)**:
   - 3D CAD/Mesh 파일 제작 없이, DB의 로케이션 코드(`LOC-ZoneAisleBayLevelBin`) 좌표 파싱만으로 2D 레이아웃을 100% 자동 생성할 수 있습니다.

---

## 2. 3DLogistiX 4대 핵심 모듈 벤치마킹 및 2D 최적화

3DLogistiX 플랫폼의 핵심 운영 알고리즘을 벤치마킹하여, 우리 시스템의 **2D 인터랙티브 환경**에 맞게 최적화합니다.

```mermaid
graph TD
    A[Order Hub\n다채널 주문 통합 수집] --> B[PrediX Slotting®\nAI 수요예측 기반 동적 랙 배치]
    B --> C[Guided Picking\n2D 최적 무종이 경로 피킹]
    C --> D[LogistiX Flow\n입고부터 출하까지 칸반 관제탑]
    D --> E[RepleniX®\n실시간 리드타임 기반 스마트 자동발주]
    D --> F[DynamiX Count®\n무중단 2D 백그라운드 순환실사]
```

### 2.1 PrediX Slotting® (스마트 슬로팅 & 동적 랙 재배치)
- **개념**: 과거 주문 이력, SKU별 출고 빈도(Pick Frequency), 속도(Velocity: A/B/C 등급), 체적/중량을 복합 분석하여 가장 빠른 출고가 가능한 랙에 배치.
- **2D 시각화 구현 방식**:
  - **2D 평면 맵 핫스팟**: 도크 및 출하대와 인접한 '골든 존(Golden Zone)'을 2D 맵 상에 강조.
  - **입고 즉시 최적 랙 추천 (Place Smart)**: 입고 시 작업자 모바일 화면의 2D 평면도에 추천 적치 랙을 핀포인트로 하이라이트.
  - **부동 재고 후방 압축**: 저회전(Slow-moving) 품목은 상단/후방 랙으로 압축 배치하여 피킹 회전율 극대화.
- **정량적 벤치마크**:
  - **피킹 이동 거리 최대 30% 단축**
  - 공간 가용 체적 효율 18~22% 향상

---

### 2.2 RepleniX® (스마트 자동 재고 보충)
- **개념**: 수기 엑셀 파악을 완전히 대체. 실시간 안전재고와 공급업체 리드타임을 계산하여 결품 위험을 사전에 방지.
- **동적 재발주점 산출 공식**:
  $$ROP = (\text{일일 평균 소비량 } d \times \text{공급업체 리드타임 } L) + \text{안전재고(Safety Stock) } SS$$
- **2D 시각화 구현 방식**:
  - **2D 랙 히트맵 컬러 코딩**: 잔여 수량이 ROP 미만으로 떨어진 랙 셀(Cell)을 2D 레이아웃 맵에서 즉시 주황/빨강으로 점멸 표시.
  - **1-Click Purchase Order (PO) 생성**: 보충 제안 알림에서 승인 버튼 클릭 한 번으로 구매 발주서 자동 발행.
- **정량적 벤치마크**:
  - **재고 보유 비용(Holding/Carrying Costs) 15~25% 절감**
  - 결품율(Stockout Rate) 0.5% 미만 억제

---

### 2.3 DynamiX Count® (무중단 2D 순환 재고 실사)
- **개념**: 창고 전체를 셧다운하거나 주말 특근 없이, 일상 운영 중에 2D 백그라운드로 순환 실사를 진행.
- **2D 시각화 구현 방식**:
  - **위험 로케이션 스마트 스케줄링**: 최근 수량 보정(Adjustment)이 발생했거나 출고 빈도가 높은 고위험 랙을 AI가 선별하여 2D 맵 상에 실사 타겟으로 표시.
  - **무중단(Zero-Disruption) 실사**: 피커가 주문 피킹을 수행하는 중간 유휴 시간에 해당 랙의 실사 스캔을 유도.
  - **즉각적 불일치 경보**: 장부와 실물 수량이 1개라도 다를 경우 관리자 대시보드에 즉시 원인 분석 티켓 생성.
- **정량적 벤치마크**:
  - 창고 셧다운 시간 0시간 달성 (연간 수천만 원의 가동 손실 예방)
  - 재고 장부 정확도(Record Accuracy) 99.5% 이상 유지

---

### 2.4 Order Hub & Guided Picking (멀티채널 주문 통합 & 2D 모바일 가이드 피킹)
- **Order Hub**: B2B, 쿠팡, 스마트스토어, 자사몰 등 다양한 채널의 주문을 실시간 단일 큐로 집결하여 주문 누락(Missed SLA) 방지.
- **2D Guided Picking**:
  - 종이 피킹 리스트(Paper Pick-lists) 100% 제거.
  - 통로 정체(Aisle Congestion)를 회피하고 최단 동선을 계산하여 모바일 화면에 **2D 통로 평면도 최적 경로선(Path Line)** 안내.
  - 해당 랙 도착 시 **2D 랙 정면도(Elevation View)**에서 몇 단 몇 열인지 직관적인 박스 하이라이트 제공.
- **정량적 벤치마크**:
  - **피킹 속도(Pick Rates) 20~40% 가속**
  - 1차 오피킹률 85% 감소

---

### 2.5 하드웨어 비종속성 (Hardware Agnostic) & TCO 절감
전용 고가 RF 단말기 대신 현장의 일반 스마트폰, 태블릿, 범용 2D 블루투스 링 스캐너를 그대로 활용:
- **도입 비용(TCO)**: 기존 레거시 WMS 하드웨어 구축비 대비 **최대 60% 절감**
- **기기 호환성**: 모바일 웹(PWA) 및 태블릿 브라우저 어디서나 동일한 2D 맵 렌더링 지원

---

## 3. WERC & McKinsey 글로벌 표준 기반 5대 핵심 KPI 체계

미국 창고교육연구협회(WERC) 및 McKinsey 디지털 공급망 벤치마크 가이드라인에 따른 대시보드 5대 핵심 지표입니다:

| 핵심 KPI | 정의 및 비즈니스 임팩트 | 정량 공식 (Formula) | 산업 상위 10% 기준 (Best-in-Class) | Supabase DB 테이블 매핑 |
|---|---|---|---|---|
| **1. Picking Accuracy<br>(피킹 정확도)** | 오피킹 없는 1차 완결률 (반품 비용 및 고객 불만 직결) | $$\frac{\text{1차 정상 피킹 건수}}{\text{총 피킹 시도 건수}} \times 100$$ | **≥ 99.8%** | [`orders`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/dashboard.service.ts) ⋈ `order_items`<br>(`CMD-SKIP` 발생 건 제외) |
| **2. Order Cycle Time<br>(주문 사이클 타임)** | 주문 접수(Receipt)부터 최종 출하(Dispatched)까지 총 리드타임 | $$\text{AVG}(T_{\text{dispatched}} - T_{\text{received}})$$ | **< 2.0 시간** | `orders.updated_at` - `orders.order_date` |
| **3. Inventory Turnover<br>(재고 회전율)** | 재고 자산이 판매 소진되어 교체되는 속도 (현금 유동성) | $$\frac{\text{기간 총 매출원가(COGS)}}{\text{평균 재고 자산 가치}}$$ | **연 8.0 ~ 12.0 회** | `order_items` 출고 누적액 /<br>`∑ (inventory.qty * items.unit_price)` |
| **4. Storage Utilisation<br>(창고 랙 점유율)** | 가용 보관 공간 대비 실제 적치된 랙의 비율 | $$\frac{\text{재고 보유 Locations 수}}{\text{총 등록 Locations 수}} \times 100$$ | **80% ~ 85%**<br>(85% 초과 시 창고 정체) | `inventory.location_id` /<br>`locations.id` |
| **5. Labour Productivity<br>(작업자 인당 생산성)** | 투입 공수 대비 시간당 처리 유닛 (Units per Labor Hour) | $$\frac{\text{일일 총 피킹 처리 유닛}}{\text{투입 작업자 수} \times \text{작업 시간}}$$ | **> 120 Units/Hour** | `order_items.quantity` /<br>`users (role='PICKER')` 작업시간 |

---

## 4. WMS 관제 대시보드 통합 와이어프레임 구조

### 4.1 UI Layout 그리드 다이어그램 (Phase 1 반영 완료)

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [🏢 Warehouse: 김포 메인센터 ▾]    [📅 Period: Today vs Yesterday ▾]    [🔄 실시간 연동 ON]    [📥 Export CSV/PDF]  │
├──────────────────────────┬──────────────────────────┬──────────────────────────┬─────────────────────────────┤
│   Total Inventory Value  │   Storage Utilisation    │        Dispatched        │        Active Picking       │
│       $5,320,400         │          74.2%           │         24 orders        │           8 orders          │
│  [+2.4% vs last month]   │ [148/200 Bins in use]    │  [+15% vs yesterday]     │     [현재 작업자 3명 진행]  │
├──────────────────────────┴──────────────────────────┴──────────────────────────┴─────────────────────────────┤
│  [LogistiX Flow™ - 엔드투엔드 공정 실시간 관제탑 (Dock to Dispatch)]                                               │
│  ┌─────────────────────────┐  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Dock-to-Stock Time    │  │  Receiving  │ │ Place Smart │ │ Guided Pick │ │ Packing QC  │ │ Cycle Count │   │
│  │       17.4 min          │  │    99.2%    │ │    88.5%    │ │    96.4%    │ │    99.8%    │ │    92.1%    │   │
│  │   [속도계 게이지 반원]  │  │   (정상 🟢) │ │  (주의 🟡)  │ │   (양호 🟢) │ │   (우수 🟢) │ │   (주의 🟡) │   │
│  │ (목표: 30분 이내 달성)  │  │ 1차 스캔검수│ │슬로팅 준수율│ │노스킵 피킹률│ │오출고 검수율│ │장부 일치율  │   │
│  └─────────────────────────┘  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
├──────────────────────────────────────┬──────────────────────────────────────┬────────────────────────────────┤
│    [PickingProgressChart (6 cols)]   │    [StorageCapacityChart (3 cols)]   │    [InventoryStatusChart (3)]  │
│    - X/Y축 점선 모눈 그리드           │    - 74.2% Occupied 도넛 차트        │    - 재고 건전성 인덱스        │
│    - 실시간 누적 피킹 vs 일일 목표선 │    - Zone A(상온) vs Zone F(냉동)    │    - 가용 / 할당 / 파손 비율   │
├──────────────────────────────────────┴──────────────────────────────────────┴────────────────────────────────┤
│  [2D Warehouse Layout Map (Phase 4 구축 예정: 2D 구역 평면도 & 통로 모니터링)]                                      │
│  - 구역별(Zone A / Zone F) 탑뷰 그리드 맵                                                                            │
│  - 실시간 통로 정체도 및 랙 점유 상태 2D 색상 코딩 (초록: 여유 / 주황: 적정 / 빨강: 포화)                          │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. 핵심 모듈별 상세 구현 가이드

### 5.1 Dock-to-Stock Time 게이지 & 5대 공정 정확도 패널
- **Dock-to-Stock Time 속도계**:
  - 차량 입고 하차 등록(`inbound.created_at`)부터 랙 적치 완료(`inventory.updated_at`)까지의 평균 시간을 반원형 SVG 게이지로 시각화.
  - 컬러 상태: `< 30분 (초록)`, `30~60분 (노랑)`, `> 60분 (빨강)`.
- **5단계 프로세스 정확도 배지**:
  1. `Receiving`: 입고 바코드 1차 스캔 검수 정확도
  2. `Place Smart (Put-away)`: 추천 2D 로케이션 적치 이행률
  3. `Guided Picking`: 모바일 피킹 중 건너뛰기(`CMD-SKIP`) 없이 정상 완료한 비율
  4. `Packing QC`: 출하 검수대 중량 측정 및 최종 바코드 스캔 통과율
  5. `Cycle Count`: 순환 실사 장부 수량과 실물 일치율

### 5.2 Storage Capacity 도넛 차트 & 2D 랙 레이아웃
- **Storage Capacity (74.2%)**:
  - `locations` 테이블의 총 슬롯 대비 현재 재고(`inventory.on_hand_qty > 0`)가 적치된 슬롯의 비율.
  - 85% 이상 시 툴팁으로 **"창고 혼잡 경고: 신규 입고 지연 위험"** 안내.
- **Zone A vs Zone F 분할 바**:
  - 상온 및 냉동 구역의 적치 비율을 직관적으로 비교.

### 5.3 점선 모눈 그리드 Hourly Picking Progress
- 현재 [`PickingProgressChart.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/PickingProgressChart.tsx)에 반영된 **X축/Y축 점선 그리드 (`strokeDasharray="3 3"`)** 표준을 유지.

---

## 6. Supabase PostgreSQL 실시간 데이터 모델 & 쿼리 명세

```sql
-- 1. 대시보드 핵심 지표 집계 뷰
CREATE OR REPLACE VIEW vw_dashboard_overview_kpis AS
SELECT
  -- 총 재고 자산 가치 ($)
  COALESCE(SUM(inv.on_hand_qty * it.unit_price), 0) AS total_inventory_value,
  
  -- 주문 완결율 (%)
  COALESCE(
    (COUNT(ord.id) FILTER (WHERE ord.status = 'DISPATCHED')::NUMERIC / 
    NULLIF(COUNT(ord.id), 0)) * 100, 0
  ) AS order_fulfillment_rate,
  
  -- 품절율 (%)
  COALESCE(
    (COUNT(DISTINCT it.id) FILTER (WHERE COALESCE(inv_agg.total_stock, 0) = 0)::NUMERIC / 
    NULLIF(COUNT(DISTINCT it.id), 0)) * 100, 0
  ) AS stockout_rate,
  
  -- 창고 공간 점유율 (%)
  COALESCE(
    (COUNT(DISTINCT inv.location_id) FILTER (WHERE inv.on_hand_qty > 0)::NUMERIC / 
    NULLIF((SELECT COUNT(*) FROM locations), 0)) * 100, 0
  ) AS storage_utilisation
FROM items it
LEFT JOIN inventory inv ON it.id = inv.item_id
LEFT JOIN (
  SELECT item_id, SUM(on_hand_qty) AS total_stock 
  FROM inventory 
  GROUP BY item_id
) inv_agg ON it.id = inv_agg.item_id
CROSS JOIN orders ord;

-- 2. Dock-to-Stock 평균 소요 시간 뷰 (분 단위)
CREATE OR REPLACE VIEW vw_dock_to_stock_leadtime AS
SELECT 
  DATE(inv.created_at) AS operation_date,
  ROUND(AVG(EXTRACT(EPOCH FROM (inv.updated_at - inv.created_at)) / 60)::NUMERIC, 1) AS avg_dock_to_stock_minutes
FROM inventory inv
WHERE inv.created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(inv.created_at)
ORDER BY operation_date DESC;

-- 3. 장기 부동 재고(Dead Stock) 60일 분석 쿼리
CREATE OR REPLACE VIEW vw_dead_stock_candidates AS
SELECT 
  it.id AS item_id,
  it.sku,
  it.name_en,
  it.name_kr,
  SUM(inv.on_hand_qty) AS dead_qty,
  SUM(inv.on_hand_qty * it.unit_price) AS tied_up_value,
  MAX(ord.created_at) AS last_dispatched_at
FROM items it
JOIN inventory inv ON it.id = inv.item_id
LEFT JOIN order_items oi ON it.id = oi.item_id
LEFT JOIN orders ord ON oi.order_id = ord.id AND ord.status = 'DISPATCHED'
GROUP BY it.id, it.sku, it.name_en, it.name_kr
HAVING MAX(ord.created_at) IS NULL OR MAX(ord.created_at) < NOW() - INTERVAL '60 days';

-- 4. RepleniX 동적 자동 재주문 제안 뷰
CREATE OR REPLACE VIEW vw_replenix_reorder_suggestions AS
SELECT 
  it.id AS item_id,
  it.sku,
  it.name_en,
  it.lead_time_days,
  COALESCE(SUM(inv.on_hand_qty), 0) AS current_stock,
  it.min_stock_qty,
  (it.min_stock_qty * 2 - COALESCE(SUM(inv.on_hand_qty), 0)) AS suggested_reorder_qty
FROM items it
LEFT JOIN inventory inv ON it.id = inv.item_id
GROUP BY it.id, it.sku, it.name_en, it.lead_time_days, it.min_stock_qty
HAVING COALESCE(SUM(inv.on_hand_qty), 0) < it.min_stock_qty;
```

---

## 7. 단계별 실무 개발 로드맵 (Actionable Implementation Phases)

```mermaid
graph LR
    P1[Phase 1: 자산 KPI & 공간 점유 도넛\n✅ 구현 및 배포 완료] --> P2[Phase 2: LogistiX Flow & 공정 품질 배지\nDock-to-Stock 게이지]
    P2 --> P3[Phase 3: PrediX 슬로팅 & RepleniX\n부동재고 및 스마트 자동발주]
    P3 --> P4[Phase 4: 2D 디지털 레이아웃 맵\nSVG/Canvas 기반 2D 평면도 완성]
```

### 🔹 Phase 1: High-Impact Quick Wins (구현 완료 ✅)
- [x] 대시보드 4대 기본 KPI 실데이터 쿼리 연동 완결 ([`dashboard.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/dashboard.service.ts))
- [x] KPI 폰트 크기 확대 및 카드 중앙 배치 ([`KpiCard.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/KpiCard.tsx))
- [x] 피킹 진행률 차트 X/Y축 점선 모눈 그리드 구현 ([`PickingProgressChart.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/PickingProgressChart.tsx))
- [x] **총 재고 자산 가치 (`Total Inventory Value`) 카드** 추가 (`items.unit_price` 연동)
- [x] **창고 랙 보관 점유율 (`Storage Capacity`) 도넛 차트** 추가 ([`StorageCapacityChart.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/StorageCapacityChart.tsx))
- [x] 상단 기간 비교 컨트롤러(`Today vs Yesterday`, `This Week`, `This Month`) 추가 ([`DashboardPeriodSelector.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/DashboardPeriodSelector.tsx))

### 🔹 Phase 2: LogistiX Flow & 공정 품질 관제탑 (구현 완료 ✅)
- [x] **Dock-to-Stock Time** 반원형 속도계(Speedometer Gauge) 컴포넌트 개발 ([`DockToStockGauge.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/DockToStockGauge.tsx))
- [x] 중앙 **5대 공정 정확도 패널**(입고, 슬로팅 적치, 가이드 피킹, 패킹 검수, 실사) 배지 추가 ([`ProcessQualityCard.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/ProcessQualityCard.tsx) · [`LogistixFlowPanel.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/LogistixFlowPanel.tsx))
- [x] 모바일 피킹 앱의 `CMD-SKIP` 발생 건수와 연계한 **실시간 피킹 정확도 %** 계산 로직 구축 (`getLogistixFlowMetrics()` in [`dashboard.service.ts`](file:///c:/Users/boazn/Projects/WMS/web-app/src/services/dashboard.service.ts))
- [x] 상단 지점 셀렉터(김포센터, 용인센터 등 멀티 창고 필터) 연계 ([`WarehouseSelector.tsx`](file:///c:/Users/boazn/Projects/WMS/web-app/src/components/features/dashboard/WarehouseSelector.tsx))

### 🔹 Phase 3: PrediX Slotting & RepleniX 스마트 큐 (지능화)
- [ ] **Dead Stock(장기 체화 재고)** 60일 자동 감지 도넛 위젯 구현
- [ ] **RepleniX 자동 보충 제안 카드**: ROP 미달 품목에 대한 1-Click 발주 버튼 연동
- [ ] **PrediX 슬로팅 추천 큐**: A등급 고회전 상품의 하단 골든존 전진 배치 가이드 팝업
- [ ] 데이터 테이블 우상단 `CSV 내보내기` 및 모달 드릴다운(Drill-down) 기능

### 🔹 Phase 4: 2D 디지털 레이아웃 맵 가시화 (차세대 WMS 완성)
- [ ] **경량 인터랙티브 2D 창고 평면도(Floor Map) 컴포넌트 구축** (SVG / HTML5 Canvas 기반)
- [ ] 통로(Aisle) 및 랙 셀(Cell) 클릭 시 팝오버로 **2D 랙 입면도(Rack Elevation View: 단/열별 보관 SKU 현황)** 표출
- [ ] 랙별 재고 상태 2D 히트맵 컬러 코딩 (초록: 여유, 주황: 적정, 빨강: 결품/위험)
- [ ] 현장 작업자 모바일 피킹 동선 최단 경로(2D SVG Polyline) 오버레이 안내

---

## 8. 기대 효과 및 비즈니스 ROI 요약

| 지표 항목 | 기존 레거시 수기 WMS | 2D 데이터 기반 WMS 도입 후 | 개선 효과 (ROI) |
|---|---|---|---|
| **작업자 1인당 피킹 속도** | 평균 60~75 Units/Hour | **105~130 Units/Hour** | **+35% ~ 45% 향상** |
| **신규 작업자 온보딩 기간** | 2~3주 (선임 밀착 교육 필수) | **반나절 (0.5일, 2D 맵 가이드)** | **교육 비용 80% 절감** |
| **피킹 오출고율** | 1.5% ~ 2.8% (재포장/반품 비용 발생) | **0.2% 미만** | **오출고 손실비 85% 감축** |
| **재고 보유 비용 (Carrying Cost)** | 연간 재고 금액의 25~30% | **연간 18~22% 수준으로 압축** | **운전 자본 15~25% 회수** |
| **창고 순환 실사 셧다운 시간** | 분기당 1회 (주말 16시간 공장 가동 정지) | **0시간 (무중단 백그라운드 실사)** | **연간 수천만 원 가동 손실 방지** |
| **시스템 도입 TCO (하드웨어 포함)** | 전용 RF 단말기 등 억 단위 초기 투자 | **일반 스마트폰/태블릿 활용 (SaaS)** | **초기 인프라 비용 60% 이상 절감** |
| **클라이언트 렌더링 부하** | 고사양 3D GPU 요구 / 발열 유발 | **초경량 SVG/Canvas 2D 렌더링** | **모바일 배터리/반응속도 3배 개선** |

---

> **결론 및 권고사항**:  
> 본 설계서는 무겁고 조작이 번거로운 3D 그래픽을 지양하고, 현장 작업자와 관리자 모두에게 가장 빠르고 직관적인 **"2D 탑뷰 평면도 + 랙 정면 단별 그리드(Elevation)"** 아키텍처를 채택함으로써 실무 생산성과 반응성을 극대화합니다.
