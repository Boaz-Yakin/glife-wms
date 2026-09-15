import * as xlsx from 'xlsx'

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) {
    console.warn('No data to export')
    return
  }
  
  const worksheet = xlsx.utils.json_to_sheet(data)
  const workbook = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  
  xlsx.writeFile(workbook, `${filename}.xlsx`)
}
