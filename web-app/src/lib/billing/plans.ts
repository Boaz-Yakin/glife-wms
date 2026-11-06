export type PlanTier = "STARTER" | "PRO" | "ENTERPRISE"

export type FeatureKey =
  | "2D_WAREHOUSE_STUDIO"
  | "OFFLINE_FIRST_SYNC"
  | "DATAWEDGE_HARDWARE_SCANNER"
  | "COLD_CHAIN_TSP"
  | "TIERED_PRICING"
  | "CREDIT_LIMIT_ENGINE"
  | "WAVE_PICKING"
  | "PICK_TO_TOTE"
  | "AUDIT_LOGS"
  | "CUSTOM_DE_KITTING"

export interface PlanConfig {
  tier: PlanTier
  name: string
  priceMonthly: number
  priceAnnualMonthly: number // 15% discounted rate per month
  description: string
  maxSeats: number // -1 for unlimited
  maxMonthlyOrders: number // -1 for unlimited
  extraSeatPrice: number // 추가 작업자 1인당 월 요금 ($)
  extraOrderPrice: number // 기본 초과 주문 건당 요금 ($)
  highlight?: boolean
  features: string[]
}

export const PLANS: Record<PlanTier, PlanConfig> = {
  STARTER: {
    tier: "STARTER",
    name: "Starter",
    priceMonthly: 149,
    priceAnnualMonthly: 125,
    description: "소규모 창고 및 초기 B2B 유통사를 위한 기본 물류 솔루션",
    maxSeats: 3,
    maxMonthlyOrders: 1000,
    extraSeatPrice: 15,
    extraOrderPrice: 0.05,
    features: [
      "기본 3명 작업자 계정 (초과: $15/명)",
      "월 1,000건 주문 처리 (초과: $0.05/건)",
      "표준 바코드 입출고 & 실사",
      "기본 재고 관리 & 로케이션 관리",
      "단일 주문 기본 피킹 러너",
      "고객사/매장 관리",
    ],
  },
  PRO: {
    tier: "PRO",
    name: "Professional",
    priceMonthly: 389,
    priceAnnualMonthly: 329,
    description: "중대형 물류센터 및 성장하는 프랜차이즈 유통사를 위한 고성능 패키지",
    maxSeats: 10,
    maxMonthlyOrders: 10000,
    extraSeatPrice: 12,
    extraOrderPrice: 0.03,
    highlight: true,
    features: [
      "기본 10명 작업자 계정 (초과: $12/명)",
      "월 10,000건 주문 처리 (초과: $0.03/건)",
      "2D 비주얼 창고 스튜디오 (캔버스 드래그&드롭)",
      "Zebra DataWedge & 산업용 PDA SDK 연동",
      "Cold Chain 2D TSP 최단 동선 피킹 엔진",
      "B2B 수주몰 차등 등급 단가 & 여신 한도 통제",
      "모바일 오프라인 우선(IndexedDB) 0-지연 동기화",
      "부속 품목 자동 세트 해체(De-kitting)",
    ],
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Enterprise",
    priceMonthly: 950,
    priceAnnualMonthly: 799,
    description: "대형 3PL 물류 전문 기업 및 프랜차이즈 본사를 위한 엔터프라이즈 솔루션",
    maxSeats: -1, // Unlimited
    maxMonthlyOrders: -1, // Unlimited
    extraSeatPrice: 0,
    extraOrderPrice: 0,
    features: [
      "작업자 계정 무제한",
      "월 주문 처리량 무제한",
      "동적 파동 출고 (Wave Picking 자동 군집화)",
      "다중 오더 카트 분배 피킹 (Pick-to-Tote 1~8단)",
      "전사 보안 감사 로그 (Audit Logs & ISO-27001)",
      "우선 전담 기술 지원 및 99.9% 가동률 SLA",
      "ERP / 외부 솔루션 연동 전용 Webhook",
    ],
  },
}

/**
 * 플랜별 기능 지원 매트릭스
 */
const FEATURE_MINIMUM_TIERS: Record<FeatureKey, PlanTier> = {
  "2D_WAREHOUSE_STUDIO": "PRO",
  "OFFLINE_FIRST_SYNC": "PRO",
  "DATAWEDGE_HARDWARE_SCANNER": "PRO",
  "COLD_CHAIN_TSP": "PRO",
  "TIERED_PRICING": "PRO",
  "CREDIT_LIMIT_ENGINE": "PRO",
  "CUSTOM_DE_KITTING": "PRO",
  "WAVE_PICKING": "ENTERPRISE",
  "PICK_TO_TOTE": "ENTERPRISE",
  "AUDIT_LOGS": "ENTERPRISE",
}

const TIER_HIERARCHY: Record<PlanTier, number> = {
  STARTER: 1,
  PRO: 2,
  ENTERPRISE: 3,
}

/**
 * 기능 접근 권한 검사 (Gatekeeper)
 */
export function canAccessFeature(currentPlan: PlanTier = "STARTER", feature: FeatureKey): boolean {
  const currentRank = TIER_HIERARCHY[currentPlan] || 1
  const requiredTier = FEATURE_MINIMUM_TIERS[feature] || "STARTER"
  const requiredRank = TIER_HIERARCHY[requiredTier] || 1

  return currentRank >= requiredRank
}

export function getRequiredPlanForFeature(feature: FeatureKey): PlanTier {
  return FEATURE_MINIMUM_TIERS[feature] || "STARTER"
}
