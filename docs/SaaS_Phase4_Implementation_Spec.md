# 📋 Phase 4: 엔터프라이즈 확장, Open API (Headless WMS) & 파일럿 GTM 상세 개발 명세서
> **문서 대상**: `WMS Web-App`, `WMS Mobile-App`, `OrderAPP`, `G-Manager`  
> **문서 버전**: v1.0.0  
> **기준 마스터 플랜**: [`docs/SaaS_Productization_Master_Plan.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Productization_Master_Plan.md)  
> **선행 조건**: [`docs/SaaS_Phase3_Implementation_Spec.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Phase3_Implementation_Spec.md)  
> **작성 일자**: 2026-11-01  
> **목표 기간**: 총 6주 (엔터프라이즈 완성 및 정식 시장 진출)

---

## 1. 개요 및 비즈니스 목표 (Business Goals)

Phase 4는 본 B2B SaaS 시스템을 **"단순 중소형 도매용 솔루션을 넘어, 대형 유통사 및 전문 3PL 물류센터까지 수용할 수 있는 엔터프라이즈급 SCM 플랫폼"**으로 완성하고, 실제 협력 유통업체 3곳을 온보딩하여 유료 전환(GTM)을 달성하는 최종 단계입니다.

### 🎯 4대 핵심 목표
1. **Headless WMS (Open REST API & Webhooks)**: 대기업이 자체 ERP나 자체 몰을 유지하면서 우리 WMS 재고/피킹 엔진만 연동해 쓸 수 있는 API 게이트웨이.
2. **3PL 정산 엔진 (Storage & Handling Billing)**: 파렛트/CBM당 일일 보관료, 입출고 하역 피, 유통기한 초과 할증료 자동 산출 및 청구.
3. **공급사 위탁 재고 포털 (Vendor VMI Portal)**: 납품 식품 제조사가 직접 실시간 소진량을 보고 입고를 계획하는 협업 뷰.
4. **3개사 파일럿 런칭 및 GTM(Go-To-Market)**: 글라이프 협력사 대상 실전 테스트, SLA 99.9% 보증, 정식 세일즈 파이프라인 가동.

---

## 2. 주차별 상세 구현 로드맵 (6-Week Schedule)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Week 1-2: Open REST API 게이트웨이 & 실시간 Webhook 엔진 (Headless WMS)│
├────────────────────────────────────────────────────────────────────────┤
│ Week 3:   3PL 물류 정산 엔진 (일일 파렛트 보관료 & 입출고 작업비 청구) │
├────────────────────────────────────────────────────────────────────────┤
│ Week 4:   공급사 위탁 재고 포털 (Vendor Managed Inventory, VMI)       │
├────────────────────────────────────────────────────────────────────────┤
│ Week 5:   부하 테스트(10만 SKU/초당 500건 피킹) & SLA 99.9% 고가용성  │
├────────────────────────────────────────────────────────────────────────┤
│ Week 6:   3개 유통사 파일럿 온보딩 & 정식 B2B 마케팅/영업 런칭 (GTM)   │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 📅 Week 1-2: Open REST API & Webhook 엔진 (Headless WMS)

#### [Task 1.1] 테넌트 API 키 발급 및 사용량 통제 스키마
```sql
-- 테넌트별 Open API 인증 키
CREATE TABLE IF NOT EXISTS public.tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,                -- e.g. 'SAP ERP 연동용 키'
    api_key_prefix VARCHAR(10) NOT NULL,       -- 'wms_live_'
    hashed_secret TEXT NOT NULL,
    permissions JSONB DEFAULT '["read:inventory", "write:orders"]',
    rate_limit_per_minute INT DEFAULT 600,     -- 분당 호출 한도
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테넌트 웹훅 등록 테이블
CREATE TABLE IF NOT EXISTS public.tenant_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    target_url TEXT NOT NULL,
    subscribed_events TEXT[] NOT NULL,         -- ['order.created', 'inventory.depleted', 'picking.completed']
    secret_key TEXT NOT NULL,                  -- HMAC 서명 검증용
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### [Task 1.2] 표준 엔터프라이즈 REST API 엔드포인트 구축
* `GET /api/v1/inventory/realtime`: SKU별 가용재고, 예약재고, Multi 해체 환산재고 즉시 조회.
* `POST /api/v1/orders/create`: 외부 쇼핑몰/ERP로부터 신규 주문 일괄 인입.
* `POST /api/v1/asn/inbound`: 공급업체의 사전 입고 예정 통지(ASN) 등록.
* `GET /api/v1/tracking/shipment`: 송장 및 배송 추적 데이터 조회.

#### [Task 1.3] 신뢰성 보장 웹훅 디스패처 (Webhook Dispatcher)
* 출고 완료, 품절 발생, 입고 적치 완료 시 고객사 서버로 JSON Payload 전송.
* 응답 실패(5xx) 시 지수 백오프(Exponential Backoff: 1분, 5분, 30분, 2시간)로 최대 5회 자동 재시도.

---

### 📅 Week 3: 3PL 다중 화주 물류 정산 엔진 (3PL Billing Engine)

#### [Task 3.1] 3PL 요율표 및 정산 원장 스키마
```sql
-- 1. 화주사별 3PL 물류 요율 계약
CREATE TABLE IF NOT EXISTS public.third_party_logistics_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id), -- 화주사
    daily_pallet_storage_fee NUMERIC(10,2) DEFAULT 800,  -- 파렛트당 일일 보관료 (예: 800원)
    daily_cbm_storage_fee NUMERIC(10,2) DEFAULT 12000,   -- CBM당 일일 보관료
    inbound_handling_fee_per_box NUMERIC(10,2) DEFAULT 150, -- 입고 하역 박스당 피
    outbound_picking_fee_per_ea NUMERIC(10,2) DEFAULT 100,  -- 피킹 건당 피
    packing_fee_per_order NUMERIC(10,2) DEFAULT 500,     -- 포장 박스당 피
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 일일 3PL 보관/작업 정산 스냅샷
CREATE TABLE IF NOT EXISTS public.third_party_logistics_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    partner_id UUID REFERENCES public.partners(id),
    record_date DATE NOT NULL,
    pallet_count INT DEFAULT 0,
    storage_fee NUMERIC(10,2) NOT NULL,
    handling_fee NUMERIC(10,2) NOT NULL,
    total_fee NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### [Task 3.2] 야간 보관료 자동 정산 배치 (Midnight Storage Cron)
* 매일 자정, 창고에 체류 중인 화주사별 파렛트/로케이션 점유율을 스캔하여 일일 보관료 자동 계산.
* 월말 결산 시 `[3PL 정산서 출력]` 버튼 클릭 한 번으로 상세 내역서와 인보이스 PDF 일괄 발행.

---

### 📅 Week 4: 공급사 위탁 재고 포털 (Vendor VMI Portal)

#### [Task 4.1] VMI 공급사 전용 뷰어 권한 분기
* 납품 제조사(예: 삼양식품, 농심 등) 담당자 계정 신설 (`role: 'VENDOR'`).
* **제공 화면**:
  * 자사 납품 SKU의 현재 창고 실시간 재고량 및 안전재고 대비 소진율(%).
  * 최근 30일간 일평균 출고 추이 그래프 및 예상 품절일자(Runout Date) 실시간 안내.
  * 사전 입고 계획(ASN) 등록 및 납품서 생성 기능.

---

### 📅 Week 5: 엔터프라이즈 부하 테스트 & SLA 99.9% 고가용성 검증

#### [Task 5.1] 스트레스 & 동시성 부하 테스트 (k6 / Artillery)
* **시나리오 1 (대규모 발주 인입)**: 100개 가맹점이 동시에 발주서를 제출하는 상황(초당 300 TPS)에서 재고 잠금(Locking) 경합 없이 100% 무오류 주문 생성 검증.
* **시나리오 2 (초고속 PDA 스캔)**: 현장 작업자 30명이 동시에 초당 3회 연속 바코드 스캔 시 50ms 이내 응답 보장.
* **시나리오 3 (DB Failover)**: Supabase 읽기 복제본(Read Replica) 라우팅을 적용하여 대시보드 통계 조회가 현장 피킹 속도에 일절 영향을 주지 않도록 쿼리 분리.

---

### 📅 Week 6: 3개사 파일럿 온보딩 & 정식 시장 런칭 (GTM)

#### [Task 6.1] 글라이프 협력사 및 유사 식자재 납품업체 3곳 선정
* **타겟 1**: 수도권 냉동/냉장 가공식품 도매업체 (보관 랙 50개, SKU 300개).
* **타겟 2**: 프랜차이즈 식자재 유통 3PL 업체 (가맹점 70곳, OrderAPP 중심).
* **타겟 3**: 수입 음료/과자 전문 유통사 (박스↔낱개 번들 해체 위주).

#### [Task 6.2] 50% 할인 파일럿 프로모션 & 2주 밀착 안정화
* 2개월간 구독료 50% 할인 제공 조건으로 실전 현장 가동 및 VOC(고객의 소리) 수집.
* 발생한 현장 엣지 케이스 즉각 패치 후 성공 사례 인터뷰(Case Study) 및 랜딩 페이지 홍보 자료 제작.

#### [Task 6.3] 공식 B2B 세일즈 & 마케팅 런칭
* B2B SCM SaaS 공식 소개 랜딩 페이지 가동 (`https://scm-saas.com` 등).
* 식자재 유통 커뮤니티, 물류신문, B2B 콜드메일 캠페인을 통한 정식 고객 유치 개시.

---

## 3. Phase 4 최종 검증 및 비즈니스 완료 기준

1. [ ] **Headless WMS**: 외부 시스템에서 REST API로 주문 생성 시 1초 내 WMS 피킹 대기열에 진입하는가?
2. [ ] **3PL 정산 엔진**: 월말 결산 시 화주사별 보관료와 작업 핸들링 피가 오차 0원으로 자동 계산되는가?
3. [ ] **VMI 공급사 뷰**: 협력 제조업체가 로그인하여 자사 납품 품목만 정확히 열람하고 사전 입고를 등록할 수 있는가?
4. [ ] **파일럿 성공**: 실제 도입 기업 3곳에서 월 결제 전환 및 현장 무중단 실가동이 완료되었는가?
