import * as React from "react"
import { PrintClient } from "./PrintClient"
import { getLocations } from "@/services/master.service"

export default async function MasterLabelsPage() {
  const { data: locationsData } = await getLocations({})
  const dbCodes = (locationsData || []).map((l) => l.code).filter(Boolean)

  return (
    <div className="flex flex-col gap-6 print:m-0 print:p-0 print:block">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">선반 랙 실물 라벨 인쇄 (Shelf Rack Labels)</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          창고 선반 랙 표준 규격(100mm × 45mm, 단별 컬러 밴드, 44pt 시각적 계층화) 라벨을 그대로 인쇄 및 PDF 저장합니다.
        </p>
      </div>

      <PrintClient initialDbCodes={dbCodes} />
    </div>
  )
}
