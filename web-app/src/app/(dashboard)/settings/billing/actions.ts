"use server"

import { revalidatePath } from "next/cache"
import { changeSubscriptionPlan } from "@/services/billing.service"
import { PlanTier } from "@/lib/billing/plans"
import { requireAdmin } from "@/lib/auth/guard"

export async function changePlanServerAction(formData: FormData) {
  try {
    await requireAdmin()
  } catch (authErr) {
    return { error: authErr instanceof Error ? authErr.message : "Unauthorized" }
  }

  const planTier = formData.get("plan_tier")?.toString() as PlanTier
  const billingCycle = (formData.get("billing_cycle")?.toString() || "MONTHLY") as "MONTHLY" | "ANNUAL"

  if (!planTier || !["STARTER", "PRO", "ENTERPRISE"].includes(planTier)) {
    return { error: "올바른 요금제 플랜을 선택해주세요." }
  }

  const res = await changeSubscriptionPlan({
    planTier,
    billingCycle,
  })

  if (!res.success) {
    return { error: "플랜 변경 중 오류가 발생했습니다." }
  }

  revalidatePath("/settings/billing")
  return { success: true }
}
