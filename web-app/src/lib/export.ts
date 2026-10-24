import * as xlsx from 'xlsx'

function autoFitColumns(data: any[], worksheet: xlsx.WorkSheet) {
  if (!data || data.length === 0) return
  const keys = Object.keys(data[0])
  worksheet['!cols'] = keys.map(key => {
    let maxLen = key.length
    for (const row of data) {
      const val = row[key]
      if (val !== undefined && val !== null) {
        maxLen = Math.max(maxLen, String(val).length)
      }
    }
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
  })
}

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }
  
  const worksheet = xlsx.utils.json_to_sheet(data)
  autoFitColumns(data, worksheet)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
  
  xlsx.writeFile(workbook, `${filename}.xlsx`)
}

export interface ExcelSheetData {
  sheetName: string
  data: any[]
}

export function exportMultiSheetExcel(sheets: ExcelSheetData[], filename: string) {
  const workbook = xlsx.utils.book_new()
  let hasValidSheet = false

  for (const sheet of sheets) {
    const sheetData = sheet.data || []
    const worksheet = xlsx.utils.json_to_sheet(sheetData.length ? sheetData : [{ Status: "No data available" }])
    if (sheetData.length) {
      autoFitColumns(sheetData, worksheet)
    }
    const cleanSheetName = sheet.sheetName.replace(/[:\\/?*\[\]]/g, '').slice(0, 31)
    xlsx.utils.book_append_sheet(workbook, worksheet, cleanSheetName || 'Sheet')
    hasValidSheet = true
  }

  if (!hasValidSheet) {
    const emptySheet = xlsx.utils.json_to_sheet([{ Notice: "No data exported" }])
    xlsx.utils.book_append_sheet(workbook, emptySheet, "Report")
  }

  xlsx.writeFile(workbook, `${filename}.xlsx`)
}
