import { Metadata } from "next"
import { getWarehouseStudioLayout } from "@/services/warehouse-studio.service"
import { WarehouseStudioClient } from "@/components/features/warehouse-studio/WarehouseStudioClient"

export const metadata: Metadata = {
  title: "2D Warehouse Studio | WMS",
  description: "인터랙티브 2D 비주얼 창고 도면 에디터 및 로케이션 자동 생성",
}

export const dynamic = "force-dynamic"

export default async function WarehouseStudioPage() {
  const { data: layout } = await getWarehouseStudioLayout()

  const safeLayout = layout || {
    id: "",
    tenant_id: "",
    warehouse_name: "Primary Warehouse",
    grid_width: 60,
    grid_height: 40,
    layout_data: {
      viewport: { zoom: 1, panX: 20, panY: 20 },
      nodes: [],
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  return <WarehouseStudioClient initialLayout={safeLayout} />
}
