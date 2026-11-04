import * as React from "react"
import { getStoreItemPrices } from "@/services/pricing.service"
import { getItems, getClients } from "@/services/master.service"
import { getStores } from "@/services/stores.service"
import { getActiveClientAction } from "@/app/actions/client.actions"
import { PricingTable } from "@/components/features/master/PricingTable"

export const dynamic = "force-dynamic"

export default async function MasterPricingPage() {
  const [pricingRes, itemsRes, storesRes, clientsRes, activeClientId] = await Promise.all([
    getStoreItemPrices({ limit: 300 }),
    getItems({ limit: 500 }),
    getStores({ limit: 200 }),
    getClients(),
    getActiveClientAction(),
  ])

  const pricingData = pricingRes.data || []
  const items = (itemsRes.data || []).map((item: any) => ({
    id: item.id,
    name_en: item.name_en,
    sku: item.sku,
    unit_price: item.unit_price,
    box_price: item.box_price,
    pack_price: item.pack_price,
  }))
  const stores = (storesRes.data || []).map((store: any) => ({
    id: store.id,
    name: store.name,
    store_no: store.store_no,
    price_tier: store.price_tier,
  }))
  const clients = (clientsRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    code: c.code,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Tiered Pricing & Special Rates</h2>
        <p className="text-muted-foreground mt-1">
          B2B 수주몰 가맹점 등급별(VIP, WHOLESALE, STANDARD) 차등 단가 및 매장별 예외 맞춤 단가를 관리합니다.
        </p>
      </div>

      {pricingRes.error ? (
        <div className="rounded-md bg-destructive/15 p-4 text-destructive text-sm">
          단가 데이터를 불러오지 못했습니다: {pricingRes.error}
        </div>
      ) : (
        <PricingTable
          data={pricingData}
          items={items}
          stores={stores}
          clients={clients}
          activeClientId={activeClientId}
        />
      )}
    </div>
  )
}
