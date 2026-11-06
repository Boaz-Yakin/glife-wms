# 📋 Phase 3: SaaS 빌링, 셀프 온보딩 위저드 & 운영 자동화 상세 개발 명세서
> **문서 대상**: `WMS Web-App`, `WMS Mobile-App`, `OrderAPP`, `G-Manager`  
> **문서 버전**: v1.0.0  
> **기준 마스터 플랜**: [`docs/SaaS_Productization_Master_Plan.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Productization_Master_Plan.md)  
> **선행 조건**: [`docs/SaaS_Phase2_Implementation_Spec.md`](file:///c:/Users/boazn/Projects/WMS/docs/SaaS_Phase2_Implementation_Spec.md)  
> **작성 일자**: 2026-11-01  
> **목표 기간**: 총 4주 (SaaS 수익화 및 확장 자동화)

---

## 1. 개요 및 비즈니스 목표 (Business Goals)

Phase 3의 핵심 목표는 **"고객사가 홈페이지에서 요금제를 결제하고, 가이드에 따라 30분 만에 자체 데이터를 입력하여 영업/물류를 즉시 가동하는 완전한 셀프서비스(Product-Led Growth, PLG) 체계 구축"**입니다.

### 🎯 3대 핵심 목표
1. **구독 결제 및 라이선스 엔진 구축**: 토스페이먼츠(국내) 및 Stripe(글로벌) 정기 결제, 플랜별 기능 제한(Gatekeeper) 및 자동 청구.
2. **30분 셀프 온보딩 위저드 (Self-Onboarding Wizard)**: 로고 등록, 엑셀 마스터 업로드, 바코드 라벨 인쇄까지 원스톱 가이드.
3. **WMS 운영 자원 종량제 과금(Usage Metering) & 보안 감사 로그**: 현장 PDA/작업자 추가 계정(Seat), 월 주문 처리량 초과분 트래킹 및 전수 보안 감사 로그.

---

## 2. 주차별 상세 구현 로드맵 (4-Week Schedule)

```
┌────────────────────────────────────────────────────────────────────────┐
│ Week 1: 정기 구독 결제(토스/Stripe) 및 테넌트 플랜 게이트키퍼 구축     │
├────────────────────────────────────────────────────────────────────────┤
│ Week 2: 30분 셀프 온보딩 마법사 & 엑셀 마스터 일괄 유효성 검증 엔진    │
├────────────────────────────────────────────────────────────────────────┤
│ Week 3: WMS 자원 종량제 미터링(PDA 추가 계정/주문 처리량) & 통합 청구   │
├────────────────────────────────────────────────────────────────────────┤
│ Week 4: 전사 보안 감사 로그(Audit Logs) & 테넌트 헬프센터 티켓팅       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 📅 Week 1: 정기 구독 결제(토스/Stripe) & 플랜 게이트키퍼

#### [Task 1.1] 구독 결제 및 청구 스키마 (`subscriptions`, `invoices`)
```sql
-- 1. 구독 상태 및 결제 주기 테이블
CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    plan_tier VARCHAR(30) NOT NULL,            -- STARTER (19만), PRO (49만), ENTERPRISE (120만)
    billing_cycle VARCHAR(20) DEFAULT 'MONTHLY',-- MONTHLY, ANNUAL (15% 할인)
    status VARCHAR(30) DEFAULT 'ACTIVE',        -- ACTIVE, PAST_DUE, TRIALING, CANCELED
    payment_method VARCHAR(20) DEFAULT 'CARD',  -- CARD, BANK_TRANSFER
    billing_key TEXT,                          -- PG사 정기결제 빌링키 (암호화)
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    trial_end_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 월별 정기 청구 인보이스
CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    base_amount NUMERIC(10,2) NOT NULL,
    usage_amount NUMERIC(10,2) DEFAULT 0,      -- 알림톡 등 추가 종량 과금
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'PAID', -- PAID, FAILED, PENDING
    paid_at TIMESTAMPTZ,
    receipt_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### [Task 1.2] PG사 정기 결제 Webhook & 스케줄러 (`/api/billing/webhook`)
* **토스페이먼츠 빌링 연동**:
  * 고객사 관리자가 카드 등록 시 `billingKey` 발급.
  * 매월 결제일 자정에 자동 승인 요청 (`POST /v1/billing/{billingKey}`).
  * 결제 실패 시 3일 간격 3회 재시도(Smart Dunning) 및 관리자에게 카카오톡/이메일 결제 실패 알림 발송.
* **플랜 기능 제한 가드 (Feature Gatekeeper)**:
  * 예: `Starter` 플랜 고객이 2D 창고 맵 또는 고급 De-kitting 규칙을 열람하려고 할 때:
    * `canAccessFeature(tenantId, '2D_MAP')` $\rightarrow$ `false` 반환.
    * UI에 **"이 기능은 Pro 플랜 이상에서 지원됩니다. [업그레이드]"** 모달 팝업 표시.

---

### 📅 Week 2: 30분 셀프 온보딩 마법사 & 엑셀 일괄 업로드

#### [Task 2.1] 스텝 바이 스텝 온보딩 위저드 (`/onboarding`)
* 신규 가입 테넌트가 로그인했을 때 최초 1회 자동으로 실행되는 5단계 가이드:
  1. **[Step 1: 브랜딩]**: 회사명, 로고 파일 드래그 앤 드롭, 브랜드 대표 컬러(Color Picker) 선택.
  2. **[Step 2: 상품 등록]**: 엑셀 템플릿 다운로드 $\rightarrow$ 자사 상품 목록 업로드 $\rightarrow$ 실시간 검증.
  3. **[Step 3: 창고 구획]**: 간이 창고 생성기(구역 수, 랙 수 입력으로 기본 바코드 로케이션 즉시 생성).
  4. **[Step 4: 매장 등록]**: 가맹점/거래처 엑셀 업로드 $\rightarrow$ 가맹점 발주 계정 일괄 생성.
  5. **[Step 5: 완료 및 시험 발주]**: 가맹점 발주 테스트 1건 진행 및 WMS 피킹 화면 시연.

#### [Task 2.2] 초고속 엑셀 파서 & 데이터 유효성 검증 엔진 (`ExcelBulkImporter.ts`)
* 대용량 엑셀(5,000행 이상) 업로드 시 브라우저 멈춤 방지를 위한 Web Worker 기반 파싱.
* **유효성 검사 항목**:
  * SKU 중복 여부 검사.
  * 바코드 숫자 자릿수(EAN-13, Code128) 검증.
  * 필수값(단가, 상품명, 규격) 누락 시 엑셀 행 번호와 오류 사유를 친절한 하이라이트로 안내.

---

### 📅 Week 3: WMS 자원 종량제 미터링 (Metering) & 통합 인보이스 정산
> **설계 원칙**: 카카오 비즈메시지/알림톡 등 불필요한 서드파티 종속을 완전히 배제하고, WMS 핵심 자원인 **"현장 PDA/작업자 추가 계정"**과 **"월 처리 주문량 초과분"**을 정량화하여 과금합니다.

#### [Task 3.1] 종량제 사용량 집계 엔진 (`UsageMeterService.ts`)
```sql
CREATE TABLE IF NOT EXISTS public.tenant_usage_meters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'ADDITIONAL_SEAT', 'ORDER_OVERAGE'
    usage_count INT DEFAULT 0,
    period_month VARCHAR(7) NOT NULL, -- '2026-11'
    unit_price NUMERIC(10,2) NOT NULL, -- 추가 계정당 월 15,000원, 주문 초과건당 50원
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tenant_id, metric_type, period_month)
);
```
* **미터링 대상**:
  1. `ADDITIONAL_SEAT`: 플랜별 기본 제공 작업자 계정(Starter: 3명, Pro: 10명, Enterprise: 무제한)을 초과한 활성 사용자 수.
  2. `ORDER_OVERAGE`: 플랜별 월간 기본 주문 처리량(Starter: 월 1,000건, Pro: 월 10,000건) 초과 건수.
* 매월 말 정기 결제 시 `기본 구독료 + (초과 사용량 × 단가)`를 합산하여 단일 인보이스로 자동 청구.

#### [Task 3.2] 인앱 사용량 관제 위젯 (`/settings/billing`)
* 관리자 콘솔에서 이번 달 활성 PDA 계정 수, 당월 누적 주문량, 플랜 한도 대비 사용률(Progress Bar) 실시간 모니터링.

---

### 📅 Week 4: 엔터프라이즈 감사 로그 (Audit Logs) & 고객 지원 센터

#### [Task 4.1] 테넌트 격리 전수 감사 로그 (`/settings/audit-logs`)
* 작업자의 모든 중요 행위(재고 강제 조정, 주문 단가 임의 수정, 매장 삭제, 엑셀 다운로드 등)를 불변(Immutable) 로그 테이블에 기록:
  * 일시, 테넌트 ID, 작업자 계정, IP 주소, 작업 유형(UPDATE, DELETE), 변경 전/후 JSON Diff.
* ISO-27001 및 정보보안 규정 준수용 감사 보고서 CSV 내보내기 지원.

#### [Task 4.2] 인앱 헬프센터 및 1:1 지원 티켓 시스템
* 시스템 우측 하단 `[도움말/문의]` 버튼 연동:
  * 3분 완성 동영상 튜토리얼 (로케이션 설정법, No-Click 피킹 가이드, 발주법).
  * 1:1 기술 지원 티켓 접수 및 실시간 응대 알림 연동.

---

## 3. Phase 3 산출물 체크리스트 (Deliverables)

- [ ] 토스페이먼츠 / Stripe 정기결제 웹훅 및 스마트 청구 엔진
- [ ] 플랜별 기능 제한 가드 미들웨어 (`canAccessFeature`)
- [ ] 5단계 셀프 온보딩 마법사 GUI (`/onboarding`)
- [ ] 웹워커 기반 고성능 엑셀 대량 업로드 및 에러 검증 모듈
- [ ] WMS 자원 종량제 미터링(PDA 추가 계정/주문 초과량) 및 청구 연동 모듈
- [ ] 보안 감사 로그 열람 페이지 (`/settings/audit-logs`)
