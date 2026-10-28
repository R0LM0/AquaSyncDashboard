import { describe, expect, it } from 'vitest'
import { MockDashboardApi } from '../../../adapters/mock/MockDashboardApi'
import { CHANGE_TYPE_LABELS } from '../../../domain/labels'
import { lastDaysRange } from '../../../shared/dates'
import { formatDateTime } from '../../../shared/format'
import { buildChangeSheet, buildSummarySheet } from './exportRows'

const ANCHOR = new Date(2026, 9, 27)

async function filteredRows() {
  const api = new MockDashboardApi({ today: ANCHOR })
  const ruta = (await api.catalogs()).rutas[0].nombre
  const filters = { ...lastDaysRange(30, ANCHOR), ruta }
  const page = await api.changes(filters, 1, 5_000)
  const summary = await api.summary(filters)
  return { filters, page, summary }
}

describe('buildChangeSheet', () => {
  it('returns exactly the filtered detail rows, in the same order', async () => {
    const { page } = await filteredRows()
    const sheet = buildChangeSheet(page.rows)

    expect(sheet.rows).toHaveLength(page.total)
    expect(sheet.rows.map((row) => row[2])).toEqual(page.rows.map((row) => row.cuenta))
    expect(sheet.rows.map((row) => row[1])).toEqual(page.rows.map((row) => row.usuario))
    expect(sheet.header).toEqual([
      'Fecha',
      'Usuario',
      'Cuenta',
      'Cliente',
      'Filial',
      'Zona',
      'Ruta',
      'Tipo de cambio',
      'Origen',
    ])
  })

  it('maps every column of a row', async () => {
    const { page } = await filteredRows()
    const [first] = buildChangeSheet(page.rows).rows

    expect(first).toEqual([
      formatDateTime(page.rows[0].fecha),
      page.rows[0].usuario,
      page.rows[0].cuenta,
      page.rows[0].cliente,
      page.rows[0].filial,
      page.rows[0].zona,
      page.rows[0].ruta,
      CHANGE_TYPE_LABELS[page.rows[0].tipoCambio],
      page.rows[0].origen,
    ])
  })

  it('returns an empty sheet when there are no rows', () => {
    const sheet = buildChangeSheet([])

    expect(sheet.rows).toHaveLength(0)
    expect(sheet.header).toHaveLength(9)
  })
})

describe('buildSummarySheet', () => {
  it('describes the filters and every summary metric', async () => {
    const { filters, summary } = await filteredRows()
    const sheet = buildSummarySheet(summary, filters)

    expect(sheet.name).toBe('Resumen')
    expect(sheet.rows).toHaveLength(15)
    expect(sheet.rows.map((row) => row[0])).toContain('Cuentas trabajadas')
    expect(sheet.rows.find((row) => row[0] === 'Avance de ruta')?.[1]).toBe(summary.avanceRutaPct)
  })
})
