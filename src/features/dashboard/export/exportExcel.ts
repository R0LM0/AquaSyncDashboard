import * as XLSX from 'xlsx'
import type { Sheet } from './exportRows'

/** Builds the workbook in memory (kept apart from the download for testing). */
export function buildWorkbook(sheets: Sheet[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new()

  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet([sheet.header, ...sheet.rows])
    worksheet['!cols'] = sheet.header.map(() => ({ wch: 22 }))
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  }

  return workbook
}

export function downloadWorkbook(sheets: Sheet[], filename: string): void {
  XLSX.writeFile(buildWorkbook(sheets), filename)
}

export function exportFilename(filters: { desde: string; hasta: string }): string {
  return `avance-catastral-${filters.desde}-a-${filters.hasta}.xlsx`
}
