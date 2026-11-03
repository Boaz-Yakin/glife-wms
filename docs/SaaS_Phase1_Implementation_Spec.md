# 📋 Phase 1: 멀티테넌트 SaaS 코어 구축 상세 개발 명세서 (Implementation Spec)
> **문서 대상**: `WMS Web-App`, `WMS Mobile-App`, `OrderAPP`, `G-Manager`  
> **문서 버전**: v1.0.0  
> **기준 마스터 플랜**: [`docs/SaaS_Productization_Master_Plan.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Productization_Master_Plan.md)  
> **작성 일자**: 2026-11-01  
> **목표 기간**: 총 4주 (Zero-Downtime 마이그레이션 보장)

---

## 1. 개요 및 마이그레이션 원칙 (Core Principles)

본 명세서는 현재 글라이프(Glife) 단일 기업에 종속되어 있는 4개 시스템을 **다중 고객사를 수용할 수 있는 멀티테넌트(Multi-Tenant) B2B SaaS 코어로 전환**하기 위한 주차별 기술 구현 세부사항을 정의합니다.

### 🛡️ 3대 무결성 원칙 (Absolute Constraints)
1. **Zero-Downtime & Zero-Glitch**: 기존 글라이프 물류센터의 실시간 주문 인입, 피킹, 적치 작업이 마이그레이션 도중 1초도 중단되지 않아야 함.
2. **100% Data Isolation**: 타 기업의 품목, 재고, 주문 데이터가 교차 조회되거나 오염되는 일을 Supabase RLS(Row-Level Security)로 원천 차단.
3. **No SI-Hardcoding**: 신규 기업 추가 시 소스 코드를 건드리지 않고, 오직 DB 레코드 삽입(GUI 또는 위저드)만으로 독립 창고가 가동되어야 함.

---

## 2. 주차별 상세 구현 명세 (Week-by-Week Technical Specs)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Week 1: DB 멀티테넌시 스키마 확장 & Glife 데이터 무손실 백필 (DB Core)  │
├────────────────────────────────────────────────────────────────────────┤
│ Week 2: Glife 하드코딩 100% 제거 & 도메인별 테넌트 컨텍스트 주입 (Decouple)│
├────────────────────────────────────────────────────────────────────────┤
│ Week 3: 비즈니스 룰 엔진 범용화 (De-kit GUI & 재고 정책 스위치) (Config)│
├────────────────────────────────────────────────────────────────────────┤
│ Week 4: RLS 보안 침투 테스트 & 2호 가상 테넌트(Acme) 온보딩 시뮬레이션 (QA)│
└────────────────────────────────────────────────────────────────────────┘
```

---

### 📅 Week 1: 데이터베이스 스키마 확장 & 테넌트 격리 인프라 (DB Core)

#### [Task 1.1] 테넌트 관리 테이블 신설
```sql
-- 1. 테넌트(고객사 기업) 마스터
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,           -- e.g. 'glife', 'acme'
    company_name VARCHAR(100) NOT NULL,
    business_number VARCHAR(50),
    contact_email VARCHAR(100),
    contact_phone VARCHAR(50),
    custom_domain VARCHAR(100) UNIQUE,          -- e.g. 'wms.acmefood.com'
    subscription_plan VARCHAR(30) DEFAULT 'STARTER', -- STARTER, PRO, ENTERPRISE
    subscription_status VARCHAR(30) DEFAULT 'ACTIVE',-- ACTIVE, PAST_DUE, CANCELED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 테넌트별 환경설정 및 브랜딩
CREATE TABLE IF NOT EXISTS public.tenant_settings (
    tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
    logo_url TEXT,
    favicon_url TEXT,
    primary_color VARCHAR(20) DEFAULT '#059669',
    currency VARCHAR(10) DEFAULT 'KRW',
    currency_symbol VARCHAR(5) DEFAULT '₩',
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    stock_policy VARCHAR(30) DEFAULT 'HARD_LIMIT', -- HARD_LIMIT vs BACKORDER
    perishable_mode BOOLEAN DEFAULT TRUE,          -- FEFO 선석출 여부
    auto_dekit_enabled BOOLEAN DEFAULT TRUE,       -- 멀티팩 자동 해체 활성화
    default_dekit_location_id UUID REFERENCES public.locations(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### [Task 1.2] Glife 1호 테넌트 자동 등록 및 ID 동기화
* 기존 Glife Client ID(`9df4f04d-b4be-4256-bfa5-aa48c4fd5d13`)를 `tenants.id`로 영구 보존하여 기존 데이터와의 외래키 일관성을 유지:
```sql
INSERT INTO public.tenants (id, code, company_name, subscription_plan, subscription_status)
VALUES ('9df4f04d-b4be-4256-bfa5-aa48c4fd5d13', 'glife', 'Glife Co., Ltd.', 'ENTERPRISE', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tenant_settings (
    tenant_id, logo_url, primary_color, currency, currency_symbol,
    stock_policy, perishable_mode, auto_dekit_enabled,
    default_dekit_location_id
) VALUES (
    '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13',
    '/logo.png',
    '#059669',
    'KRW',
    '₩',
    'HARD_LIMIT',
    TRUE,
    TRUE,
    '31b632f2-e408-4d5a-bf11-47b52b8db673' -- LOC-S0105A01
) ON CONFLICT (tenant_id) DO NOTHING;
```

#### [Task 1.3] 10대 핵심 비즈니스 테이블 `tenant_id` 추가 및 백필
* 대상 테이블: `items`, `inventory`, `locations`, `orders`, `order_items`, `users`, `stores`, `partners`, `item_conversions`, `inventory_adjustments`
```sql
DO $$
DECLARE
    t TEXT;
    glife_id UUID := '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13';
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'items', 'inventory', 'locations', 'orders', 'order_items',
        'users', 'stores', 'partners', 'item_conversions', 'inventory_adjustments'
    ])
    LOOP
        -- 컬럼이 없으면 추가
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id)', t);
        -- 기존 데이터에 Glife 테넌트 ID 백필
        EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, glife_id);
        -- DEFAULT 제약 조건 부여
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT %L', t, glife_id);
    END LOOP;
END $$;
```

#### [Task 1.4] 복합 인덱스(Composite Indexes) 및 Supabase RLS 정책 수립
```sql
-- 테넌트별 쿼리 최적화 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_items_tenant_sku ON public.items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant_item ON public.inventory(tenant_id, item_id);
CREATE INDEX IF NOT EXISTS idx_locations_tenant_code ON public.locations(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_orders_tenant_status ON public.orders(tenant_id, status);

-- Supabase RLS 일원화 (JWT claim 또는 context 기반)
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Isolation Items" ON public.items
FOR ALL USING (
    tenant_id = (current_setting('app.current_tenant_id', true))::UUID
    OR (auth.jwt() ->> 'role') = 'service_role'
);
```

---

### 📅 Week 2: Glife 하드코딩 완전 분리 & 테넌트 컨텍스트 주입 (Decoupling)

#### [Task 2.1] Next.js 미들웨어 기반 테넌트 리졸버 (`tenantContext.ts`)
* 브라우저 URL 호스트네임에 따라 서브도메인을 감지하거나, 커스텀 도메인 매핑 테이블에서 테넌트 식별:
```ts
// web-app/src/lib/tenant/resolver.ts
export interface TenantContext {
  tenantId: string;
  code: string;
  companyName: string;
  settings: TenantSettings;
}

export async function resolveTenantFromHost(hostname: string): Promise<TenantContext> {
  // 1. 커스텀 도메인 확인 (e.g. wms.acmefood.com)
  // 2. 서브도메인 확인 (e.g. acme.scm-saas.com)
  // 3. 로컬호스트 개발 기본값 -> 'glife' fallback
  const subdomain = hostname.split('.')[0];
  const targetCode = subdomain === 'localhost' ? 'glife' : subdomain;

  const supabase = createAdminClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, code, company_name, tenant_settings(*)')
    .or(`code.eq.${targetCode},custom_domain.eq.${hostname}`)
    .single();

  return {
    tenantId: tenant.id,
    code: tenant.code,
    companyName: tenant.company_name,
    settings: tenant.tenant_settings,
  };
}
```

#### [Task 2.2] OrderAPP 가상 계정/이메일 생성 하드코딩 제거
* **기존 코드**: [`OrderAPP /api/order/route.ts`](file:///c:/Users/boazn/Projects/OrderAPP/dashboard/src/app/api/order/route.ts)
  ```ts
  // AS-IS: 특정 도메인 고정
  const email = `${uPhone}@glife.com`;
  ```
* **수정 후 (TO-BE)**:
  ```ts
  // TO-BE: 테넌트 코드 기반 격리 이메일
  const tenantCode = tenantCtx.code || 'default';
  const email = `${uPhone}@${tenantCode}.orderapp.local`;
  ```

#### [Task 2.3] 고정 UUID 및 로케이션 ID 제거
* **기존 코드**:
  * `client_id: '9df4f04d-b4be-4256-bfa5-aa48c4fd5d13'`
  * `target_location_id: '31b632f2-e408-4d5a-bf11-47b52b8db673'` (`LOC-S0105A01`)
* **수정 후 (TO-BE)**:
  * 세션의 `activeClientId` 또는 `tenantCtx.tenantId` 자동 주입.
  * 해체 입고 로케이션은 `tenant_settings.default_dekit_location_id`에서 동적 조회.

#### [Task 2.4] 화이트라벨링(White-Labeling) 동적 브랜딩 적용
* **WMS Web Header & Sidebar**:
  * 테넌트 로고 이미지(`tenant.settings.logo_url`) 및 회사명 노출.
* **OrderAPP Main Layout**:
  * 고객사 브랜드 컬러(`primary_color`)와 로고 동적 적용.
* **WMS Mobile App**:
  * 로그인 화면 및 홈 헤더에 해당 테넌트명 표기.

---

### 📅 Week 3: 비즈니스 룰 엔진 범용화 (De-kitting GUI & Dynamic Config)

#### [Task 3.1] 번들 해체(De-kitting) 관리자 GUI 신설 (`/master/conversions`)
* 현재 Buldak 라면에 국한된 해체 엔진을 관리자 화면에서 임의의 품목으로 등록할 수 있는 전용 GUI 페이지 구현:
  * **[부모 품목 검색 (Parent Multi/Box/Pack)]**: 품목 마스터에서 선택.
  * **[자식 품목 검색 (Child Single/EA)]**: 낱개 품목 선택.
  * **[환산 배율 (Ratio)]**: 1 pk = N EA (예: 5, 24, 40).
  * **[전용 입고 로케이션 (Target Bin)]**: 해당 창고의 보관 랙 선택.
  * **[주문 시 자동 해체 여부 (Auto De-kit on Order)]**: ON/OFF 토글.

#### [Task 3.2] 범용 De-kit RPC 함수 (`dekit_bundle_item`)
```sql
CREATE OR REPLACE FUNCTION public.dekit_bundle_item(
    p_tenant_id UUID,
    p_parent_item_id UUID,
    p_parent_qty INT,
    p_operator_id UUID DEFAULT NULL,
    p_from_location_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_conversion RECORD;
    v_target_loc_id UUID;
    v_ratio INT;
    v_child_id UUID;
    v_child_added INT;
BEGIN
    -- 테넌트 격리 하에서 변환 설정 조회
    SELECT * INTO v_conversion
    FROM public.item_conversions
    WHERE tenant_id = p_tenant_id AND parent_item_id = p_parent_item_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', '해당 테넌트의 번들 변환 설정을 찾을 수 없습니다.');
    END IF;

    v_ratio := v_conversion.conversion_ratio;
    v_child_id := v_conversion.child_item_id;
    v_target_loc_id := v_conversion.target_location_id;
    v_child_added := p_parent_qty * v_ratio;

    -- (1) 부모 재고 차감 (FIFO 기준)
    -- (2) 자식 재고 증액 (v_target_loc_id)
    -- (3) inventory_adjustments 로그 생성
    -- ...
    RETURN jsonb_build_object(
        'success', true,
        'parent_deducted', p_parent_qty,
        'child_added', v_child_added
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### [Task 3.3] 테넌트별 운영 정책 스위치 관리 화면 (`/settings`)
* **`STOCK_POLICY`**: `HARD_LIMIT`(재고 부족 시 주문 차단) vs `BACKORDER`(마이너스 재고 허용)
* **`PERISHABLE_MODE`**: `TRUE`(FEFO 선석출 및 유통기한 필수) vs `FALSE`(단순 FIFO)
* **`CUTOFF_TIME`**: 일일 발주 마감 시간(예: 18:00) 설정.

---

### 📅 Week 4: 보안 침투 검증(RLS), QA & 2호 테넌트 온보딩 시뮬레이션

#### [Task 4.1] RLS 데이터 교차 조회(Cross-Tenant Leak) 침투 테스트
* **테스트 케이스 1**: A사 인증 토큰으로 B사의 `GET /api/inventory?id={B사_재고ID}` 호출 $\rightarrow$ 403 Forbidden 또는 빈 데이터 반환 확인.
* **테스트 케이스 2**: A사 작업자 PIN으로 B사 모바일 앱 로그인 시도 $\rightarrow$ 인증 거부 확인.
* **테스트 케이스 3**: A사 OrderAPP에서 B사의 SKU 코드로 장바구니 담기 시도 $\rightarrow$ 유효하지 않은 상품 에러 확인.

#### [Task 4.2] 가상 2호 테넌트 ('Acme Food') 30분 온보딩 시뮬레이션
1. `tenants`에 `Acme Food (code: 'acme')` 등록.
2. 엑셀 템플릿으로 신규 음료 품목 15개(콜라 24캔 박스, 낱개 캔 등) 업로드.
3. Acme 전용 창고 랙 20개 자동 생성 (`LOC-A0101A01` ~ `LOC-A0105B04`).
4. 번들 해체 규칙 등록 (콜라 24캔 박스 $\rightarrow$ 낱개 1캔, Ratio: 24).
5. Acme 가맹점 생성 $\rightarrow$ OrderAPP 로그인(Acme 로고/컬러 확인) $\rightarrow$ 낱개 캔 발주.
6. WMS Web 자동할당 및 모바일 PDA 피킹 검수 확인 $\rightarrow$ 정산 인보이스 발행.

#### [Task 4.3] 글라이프 기존 운영 회귀 테스트 (Zero Side-Effect Check)
* 기존 글라이프의 모든 기능(라면 Multi/Single 해체, 로케이션 맵, PDA 입출고)이 마이그레이션 전과 100% 동일하게 완벽 작동함을 검증.

---

## 3. 리스크 평가 및 롤백 플랜 (Risk & Rollback Plan)

| 잠재 리스크 | 발생 가능성 | 영향도 | 사전 대응책 및 안전장치 |
| :--- | :---: | :---: | :--- |
| **마이그레이션 중 락(Lock) 경합** | 낮음 | 높음 | 모든 `ALTER TABLE` 및 인덱스 생성은 새벽 미출고 시간대(02:00~04:00)에 실행. |
| **기존 쿼리에서 `tenant_id` 누락** | 중간 | 높음 | 모든 테이블의 `tenant_id` 기본값을 Glife ID로 설정하여, 쿼리에서 누락되더라도 기존 Glife 데이터 자동 매핑. |
| **RLS 적용 후 쿼리 성능 저하** | 낮음 | 중간 | 모든 RLS 검사항목에 `(tenant_id, ...)` 복합 B-Tree 인덱스를 선행 생성하여 풀스캔 방지. |

---

## 4. 최종 산출물 체크리스트 (Deliverables)

- [x] DB 멀티테넌트 마이그레이션 스크립트 (`supabase/migrations/`)
- [x] 테넌트 컨텍스트 리졸버 및 미들웨어 (`web-app/src/lib/tenant/`)
- [x] Web-App & Mobile-App 가상 계정(`${phone}@{tenant}.wms.local`) 동적 테넌트 바인딩 및 호환성 완료
- [x] 번들 해체(De-kitting) 관리자 GUI 화면 (`/master/conversions`)
- [x] 멀티테넌트 보안 감사 보고서 (`docs/Security_RLS_Audit_Report.md`)
- [x] 2호 테넌트(Acme Food) 온보딩 실증 완료 보고서 (`scripts/test_rls_penetration.sql`)

> **🎉 Phase 1 달성 완료 (100%)**:  
> 본 명세서에 수립된 모든 멀티테넌시 데이터 격리(RLS), 테넌트 컨텍스트 주입, 가상 계정 도메인 동적화 및 범용 De-kitting GUI 구축이 완료되어 시스템이 완전한 **Multi-Tenant B2B SaaS 코어**로 전환되었습니다.

본 명세서에 따라 Phase 1을 완수하면, 4주 후 본 시스템은 **언제든 신규 유통사를 30분 만에 입주시킬 수 있는 완전한 B2B SaaS 코어로 거듭나게 됩니다.**
