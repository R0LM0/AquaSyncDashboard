import type { ActividadDispositivo, ActividadPorDia } from '@/domain/types'
import type { Cell } from '../coverage/coverageExcel'

/** Column headers shared by the Excel sheets and the PDF tables of both activity reports. */
export function deviceHeaders(countLabel: string): string[] {
  return ['Usuario', 'Alias', 'Modelo', 'Versión', countLabel, 'Primera', 'Última', 'Lat', 'Lng']
}
export const DEVICE_WIDTHS = [18, 16, 20, 11, 11, 18, 18, 11, 11]
export const DAY_HEADERS = ['Fecha', 'Dispositivo', 'Cantidad']
export const DAY_WIDTHS = [14, 18, 11]

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null
}

export function deviceCells(devices: ActividadDispositivo[]): Cell[][] {
  return devices.map((device) => [
    device.usuario,
    device.alias,
    device.modelo,
    device.appVersion,
    device.cantidad,
    toDate(device.primera),
    toDate(device.ultima),
    device.lat,
    device.lng,
  ])
}

export function dayCells(porDia: ActividadPorDia[]): Cell[][] {
  return [...porDia]
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.dispositivo.localeCompare(b.dispositivo))
    .map((row) => {
      const [year, month, day] = row.fecha.split('-').map(Number)
      return [new Date(year, month - 1, day), row.dispositivo, row.cantidad]
    })
}
