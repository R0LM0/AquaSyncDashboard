import { describe, expect, it } from 'vitest'
import type { BarridoActividad, BarridoAsignacion, ServiciosNuevos } from '@/domain/types'
import { buildBarridoWorkbook } from './barridoExcel'
import { buildBarridoPdf } from './barridoPdf'
import { buildServiciosWorkbook } from '../servicios/serviciosExcel'
import { buildServiciosPdf } from '../servicios/serviciosPdf'

const asignacion: BarridoAsignacion = {
  usrId: '1', usuario: 'jperez', cliBarridoId: '10', filial: '01', zona: '02', ruta: '03',
  periodoId: '202611', periodo: 'Noviembre 2026', asignadas: 10, encuestadas: 4, pendientes: 6, avance: 40,
}
const device = {
  usuario: 'enc1', dispositivoId: 'd1', alias: 'Dispositivo A', modelo: 'SM-A12', appVersion: '1.17.0',
  cantidad: 4, primera: '2026-11-01T14:00:00Z', ultima: '2026-11-01T16:00:00Z', lat: 12.1, lng: -86.2,
}
const actividad: BarridoActividad = {
  resumen: { encuestas: 4, hoy: 2, dispositivos: 1 },
  porDia: [{ fecha: '2026-11-01', dispositivo: 'Dispositivo A', cantidad: 4 }],
  dispositivos: [device],
  puntos: [{ cuenta: '1234', catastro: 'C-1', alias: 'Dispositivo A', fecha: '2026-11-01T14:00:00Z', lat: 12.1, lng: -86.2 }],
}
const servicios: ServiciosNuevos = {
  resumen: { registrados: 1, hoy: 1, porEstado: [{ estado: 'Pendiente', cantidad: 3 }] },
  porDia: actividad.porDia,
  dispositivos: [device],
  registros: [
    { id: '77', fecha: '2026-11-01T15:00:00Z', usuario: 'u1', alias: 'Dispositivo A', modelo: 'Moto', estado: 'Pendiente', sucursal: 'Managua', cliente: 'Ana Pérez', lat: 12.1, lng: -86.2 },
  ],
}

function headers(workbook: ReturnType<typeof buildBarridoWorkbook>, sheet: string): string[] {
  const values = (workbook.getWorksheet(sheet)?.getRow(1).values ?? []) as Array<string | undefined>
  return values.slice(1).map(String)
}

describe('barrido exports', () => {
  const report = { asignaciones: [asignacion], seleccion: null, actividad, pendientes: null }

  it('builds the sheets with their column headers', () => {
    const workbook = buildBarridoWorkbook(report, new Date(2026, 10, 1))

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Asignaciones', 'Dispositivos', 'Por día', 'Encuestas', 'Cuentas trabajadas'])
    expect(headers(workbook, 'Asignaciones')).toEqual([
      'Usuario', 'Filial', 'Zona', 'Ruta', 'Período', 'Asignadas', 'Encuestadas', 'Pendientes', 'Avance (%)', 'Semáforo',
    ])
    expect(headers(workbook, 'Dispositivos')).toEqual(['Usuario', 'Alias', 'Modelo', 'Versión', 'Encuestas', 'Primera', 'Última', 'Lat', 'Lng'])
    expect(headers(workbook, 'Por día')).toEqual(['Fecha', 'Dispositivo', 'Cantidad'])
    expect(headers(workbook, 'Encuestas')).toEqual(['Cuenta', 'Catastro', 'Dispositivo', 'Fecha', 'Lat', 'Lng'])
    expect(headers(workbook, 'Cuentas trabajadas')).toEqual(['Cuenta', 'N° catastral', 'Dispositivo', 'Fecha'])
    expect(workbook.getWorksheet('Cuentas trabajadas')?.rowCount).toBe(2)
    expect(workbook.getWorksheet('Asignaciones')?.rowCount).toBe(2)
  })

  it('adds the Pendientes sheet only when the layer was loaded', () => {
    const workbook = buildBarridoWorkbook(
      { ...report, seleccion: asignacion, pendientes: [{ clienteBarridoId: '10', cuentaNro: '55', catastro: 'C-9', cliente: 'Ana', direccion: 'Barrio', lat: 12, lng: -86 }] },
      new Date(2026, 10, 1),
    )
    expect(headers(workbook, 'Pendientes')).toEqual(['Cuenta', 'Catastro', 'Cliente', 'Dirección', 'Lat', 'Lng'])
  })

  it('builds a PDF', () => {
    expect(buildBarridoPdf(report, new Date(2026, 10, 1)).getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})

describe('servicios nuevos exports', () => {
  it('builds the sheets with their column headers and one row per estado in the Resumen', () => {
    const workbook = buildServiciosWorkbook(servicios, new Date(2026, 10, 1))

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(['Resumen', 'Registros', 'Dispositivos', 'Por día'])
    expect(headers(workbook, 'Registros')).toEqual(['Fecha', 'Usuario', 'Alias', 'Modelo', 'Estado', 'Sucursal', 'Cliente', 'Lat', 'Lng'])
    expect(headers(workbook, 'Dispositivos')[4]).toBe('Registros')
    expect(workbook.getWorksheet('Resumen')?.rowCount).toBe(4)
  })

  it('builds a PDF', () => {
    expect(buildServiciosPdf(servicios, new Date(2026, 10, 1)).getNumberOfPages()).toBeGreaterThanOrEqual(1)
  })
})
