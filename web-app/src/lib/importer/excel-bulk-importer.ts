import * as XLSX from "xlsx"

export interface BulkItemRow {
  sku: string
  name: string
  desc: string
  category: string
  uom: string
  unit_price: number
  box_price?: number
  pack_price?: number
  upc?: string
}

export interface BulkStoreRow {
  name: string
  address: string
  store_no: string
  phone?: string
  credit_limit?: number
  price_tier?: string
}

export interface BulkRowError {
  rowIndex: number
  column: string
  value: any
  message: string
}

export interface BulkParseResult<T> {
  totalRows: number
  validCount: number
  errorCount: number
  validRows: T[]
  errors: BulkRowError[]
}

/**
 * 대용량 품목 엑셀/CSV 파서 및 실시간 정합성 검증기
 */
export function parseItemsExcel(data: ArrayBuffer | Uint8Array): BulkParseResult<BulkItemRow> {
  const workbook = XLSX.read(data, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
      validRows: [],
      errors: [{ rowIndex: 0, column: "File", value: "", message: "빈 엑셀 파일입니다." }],
    }
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

  const validRows: BulkItemRow[] = []
  const errors: BulkRowError[] = []
  const seenSkus = new Set<string>()

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2 // 헤더를 감안한 1-based 엑셀 행 번호

    // 필드명 매핑 (영문/한글 유연 지원)
    const rawSku = (
      row["SKU"] || row["sku"] || row["상품코드"] || row["품목코드"] || ""
    ).toString().trim().toUpperCase()

    const rawName = (
      row["Name"] || row["name"] || row["상품명"] || row["품목명"] || row["Item Name"] || ""
    ).toString().trim()

    const rawDesc = (
      row["Description"] || row["desc"] || row["규격"] || row["설명"] || ""
    ).toString().trim()

    const rawCat = (
      row["Category"] || row["category"] || row["카테고리"] || row["분류"] || "General"
    ).toString().trim()

    const rawUom = (
      row["UOM"] || row["uom"] || row["단위"] || "EA"
    ).toString().trim().toUpperCase()

    const rawUnitPrice = row["Unit Price"] ?? row["unit_price"] ?? row["공급단가"] ?? row["단가"] ?? 0
    const rawBoxPrice = row["Box Price"] ?? row["box_price"] ?? row["박스단가"] ?? 0
    const rawPackPrice = row["Pack Price"] ?? row["pack_price"] ?? row["팩단가"] ?? 0
    const rawUpc = (row["Barcode"] || row["barcode"] || row["UPC"] || row["바코드"] || "").toString().trim()

    let rowHasError = false

    // 1. SKU 유효성 검사
    if (!rawSku) {
      errors.push({ rowIndex: rowNum, column: "SKU", value: rawSku, message: "SKU는 필수 입력 항목입니다." })
      rowHasError = true
    } else if (seenSkus.has(rawSku)) {
      errors.push({ rowIndex: rowNum, column: "SKU", value: rawSku, message: `중복된 SKU입니다: '${rawSku}'` })
      rowHasError = true
    } else {
      seenSkus.add(rawSku)
    }

    // 2. 품목명 검사
    if (!rawName) {
      errors.push({ rowIndex: rowNum, column: "Name", value: rawName, message: "품목명은 필수 입력 항목입니다." })
      rowHasError = true
    }

    // 3. 단위(UOM) 검사
    const allowedUom = ["EA", "BOX", "PACK", "KG", "L"]
    if (!allowedUom.includes(rawUom)) {
      errors.push({
        rowIndex: rowNum,
        column: "UOM",
        value: rawUom,
        message: `지원되지 않는 단위입니다 (${rawUom}). [EA, BOX, PACK, KG, L] 중 하나여야 합니다.`,
      })
      rowHasError = true
    }

    // 4. 단가 검사
    const unitPriceNum = Number(rawUnitPrice)
    if (isNaN(unitPriceNum) || unitPriceNum < 0) {
      errors.push({ rowIndex: rowNum, column: "Unit Price", value: rawUnitPrice, message: "단가는 0 이상의 숫자여야 합니다." })
      rowHasError = true
    }

    if (!rowHasError) {
      validRows.push({
        sku: rawSku,
        name: rawName,
        desc: rawDesc,
        category: rawCat || "General",
        uom: rawUom,
        unit_price: unitPriceNum,
        box_price: Number(rawBoxPrice) || undefined,
        pack_price: Number(rawPackPrice) || undefined,
        upc: rawUpc || undefined,
      })
    }
  })

  return {
    totalRows: rawRows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    validRows,
    errors,
  }
}

/**
 * 매장/가맹점 엑셀 파서
 */
export function parseStoresExcel(data: ArrayBuffer | Uint8Array): BulkParseResult<BulkStoreRow> {
  const workbook = XLSX.read(data, { type: "array" })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 1,
      validRows: [],
      errors: [{ rowIndex: 0, column: "File", value: "", message: "빈 엑셀 파일입니다." }],
    }
  }

  const worksheet = workbook.Sheets[firstSheetName]
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" })

  const validRows: BulkStoreRow[] = []
  const errors: BulkRowError[] = []

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2
    const rawName = (row["Store Name"] || row["매장명"] || row["가맹점명"] || row["Name"] || "").toString().trim()
    const rawAddress = (row["Address"] || row["주소"] || row["배송주소"] || "").toString().trim()
    const rawStoreNo = (row["Store No"] || row["매장코드"] || row["지점번호"] || "").toString().trim()
    const rawPhone = (row["Phone"] || row["전화번호"] || row["연락처"] || "").toString().trim()
    const rawLimit = Number(row["Credit Limit"] || row["여신한도"] || 0)

    if (!rawName) {
      errors.push({ rowIndex: rowNum, column: "Store Name", value: rawName, message: "매장명은 필수 입력 항목입니다." })
    } else {
      validRows.push({
        name: rawName,
        address: rawAddress || "배송지 정보 미입력",
        store_no: rawStoreNo || `STORE-${idx + 1}`,
        phone: rawPhone || undefined,
        credit_limit: isNaN(rawLimit) ? 0 : rawLimit,
      })
    }
  })

  return {
    totalRows: rawRows.length,
    validCount: validRows.length,
    errorCount: errors.length,
    validRows,
    errors,
  }
}

/**
 * 표준 품목 마스터 엑셀 템플릿 바이너리 생성
 */
export function generateItemTemplateExcel(): Uint8Array {
  const sampleData = [
    {
      "SKU": "BEV-COKE-01",
      "Item Name": "코카콜라 355ml",
      "Description": "24캔/박스 (캔)",
      "Category": "Beverage",
      "UOM": "BOX",
      "Unit Price": 18.50,
      "Box Price": 18.50,
      "Barcode": "8801094012345",
    },
    {
      "SKU": "SNK-CHIP-01",
      "Item Name": "포테이토 칩 오리지널",
      "Description": "60g 바삭한 감자칩",
      "Category": "Snack",
      "UOM": "EA",
      "Unit Price": 1.45,
      "Box Price": 29.00,
      "Barcode": "8801117098765",
    },
    {
      "SKU": "RAM-SPICY-01",
      "Item Name": "매운 라면 5입 멀티팩",
      "Description": "120g x 5개입",
      "Category": "Noodles",
      "UOM": "PACK",
      "Unit Price": 4.80,
      "Box Price": 38.40,
      "Barcode": "8801043054321",
    },
  ]

  const ws = XLSX.utils.json_to_sheet(sampleData)
  // 열 너비 자동 조정
  ws["!cols"] = [
    { wch: 16 }, // SKU
    { wch: 24 }, // Name
    { wch: 20 }, // Desc
    { wch: 14 }, // Category
    { wch: 8 },  // UOM
    { wch: 12 }, // Unit Price
    { wch: 12 }, // Box Price
    { wch: 18 }, // Barcode
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Item_Master_Template")
  return XLSX.write(wb, { type: "array", bookType: "xlsx" })
}
