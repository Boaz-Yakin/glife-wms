import * as React from "react"
import {
  getVendorPartners,
  getVendorVmiStock,
  getVendorAsnList,
} from "@/services/vendor-vmi.service"
import { VendorVmiClient } from "@/components/features/vendor/VendorVmiClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Vendor VMI Portal | Glife WMS",
  description: "공급사 위탁 재고 실시간 소진율 분석 및 사전 입고 예정 통지(ASN) 협업 포털",
}

export default async function VendorVmiPage({
  searchParams,
}: {
  searchParams: Promise<{ partnerId?: string }>
}) {
  const { partnerId } = await searchParams

  const { partners } = await getVendorPartners()
  const activePartnerId = partnerId || partners[0]?.id || ""

  const [{ items }, { asns }] = await Promise.all([
    getVendorVmiStock(activePartnerId),
    getVendorAsnList(activePartnerId),
  ])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Vendor Managed Inventory (VMI) Portal</h2>
        <p className="text-muted-foreground mt-1 text-xs">
          공급사/제조사가 실시간 창고 보관량과 소진 속도를 모니터링하고, 사전 입고 예정 통지(ASN)를 직접 등록하여 공급망을 최적화합니다.
        </p>
      </div>

      <VendorVmiClient
        initialPartners={partners}
        initialItems={items}
        initialAsns={asns}
      />
    </div>
  )
}
