import * as React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTenantOnboardingState } from "@/services/onboarding.service"
import { OnboardingWizardClient } from "@/components/features/onboarding/OnboardingWizardClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Onboarding Wizard | Glife WMS SaaS",
  description: "30-minute self-onboarding wizard & bulk import engine",
}

export default async function OnboardingPage() {
  const { state, error } = await getTenantOnboardingState()

  if (error || !state) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto font-bold text-xl">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-900">테넌트 정보를 불러올 수 없습니다</h1>
          <p className="text-sm text-slate-600">
            {error || "현재 접속 중인 테넌트의 정보 또는 세션을 확인할 수 없습니다."}
          </p>
          <div className="pt-2">
            <Link href="/">
              <Button variant="outline" className="w-full">
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
              대시보드
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              WMS 셀프 온보딩 마법사
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              {state.companyName} ({state.code})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="hidden sm:inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            엔터프라이즈 멀티테넌트 격리 보장
          </span>
          {state.onboarding_completed && (
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold text-[11px]">
              온보딩 완료됨
            </span>
          )}
        </div>
      </header>

      {/* Main Wizard Content */}
      <main className="flex-1 py-8 px-4 sm:px-6">
        <OnboardingWizardClient initialState={state} />
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        © 2026 Glife WMS Multi-Tenant Cloud. All rights reserved.
      </footer>
    </div>
  )
}
