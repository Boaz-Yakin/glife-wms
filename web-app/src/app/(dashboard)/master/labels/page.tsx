import * as React from "react"
import { PrintClient } from "./PrintClient"

export default function MasterLabelsPage() {
  return (
    <div className="flex flex-col gap-6 print:m-0 print:p-0 print:block">
      <div className="print:hidden">
        <h2 className="text-2xl font-bold tracking-tight">바코드 라벨 출력</h2>
        <p className="text-muted-foreground mt-1">
          상품(SKU) 또는 랙(로케이션)에 부착할 바코드 라벨을 생성하고 프린터로 전송합니다.
        </p>
      </div>

      <PrintClient />
    </div>
  )
}
