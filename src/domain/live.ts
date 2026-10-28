import type { Filters, LiveChange, MapPoint, Summary } from './types'
import { dateKeyOf, isWithinRange } from '../shared/dates'

/** Live contributions accumulated since the last authoritative refresh. */
export interface LiveDelta {
  fotosNuevas: number
  fotosActualizadas: number
  ubicaciones: number
  eventos: number
  /** Accounts and users not present in the last authoritative snapshot. */
  cuentasNuevas: number
  usuariosNuevos: number
}

export const emptyLiveDelta: LiveDelta = {
  fotosNuevas: 0,
  fotosActualizadas: 0,
  ubicaciones: 0,
  eventos: 0,
  cuentasNuevas: 0,
  usuariosNuevos: 0,
}

/** Accounts and users the last authoritative load already counted. */
export interface KnownSnapshot {
  cuentas?: ReadonlySet<string>
  usuarios?: ReadonlySet<string>
}

/**
 * Does a pushed change belong to the active filters?
 *
 * `ugestionId`/`sucursalId` are checked when the live payload carries them (the
 * real SignalR payload does). A transport that does not is accepted
 * optimistically: the debounced refresh brings the authoritative numbers and
 * drops anything that did not belong.
 */
export function matchesFilters(change: LiveChange, filters: Filters): boolean {
  if (filters.ugestionId && change.ugestionId && change.ugestionId !== filters.ugestionId) return false
  if (filters.sucursalId && change.sucursalId && change.sucursalId !== filters.sucursalId) return false
  if (filters.usuario && change.usuario !== filters.usuario) return false
  if (filters.ruta && change.ruta !== filters.ruta) return false
  if (filters.filial && change.filial !== filters.filial) return false
  if (filters.zona && change.zona !== filters.zona) return false
  if (filters.tipoCambio && change.tipoCambio !== filters.tipoCambio) return false
  return isWithinRange(dateKeyOf(change.fecha), filters.desde, filters.hasta)
}

export function accumulateLive(delta: LiveDelta, change: LiveChange): LiveDelta {
  const next: LiveDelta = { ...delta, eventos: delta.eventos + 1 }

  if (change.tipoCambio === 'FotoNueva') next.fotosNuevas += 1
  else if (change.tipoCambio === 'FotoActualizada') next.fotosActualizadas += 1
  else next.ubicaciones += 1

  return next
}

/**
 * Applies the live contributions to a summary. Accounts and users only grow
 * when the window brought one the snapshot did not know, so repeated changes on
 * the same account never inflate them. `avanceRutaPct` stays authoritative: its
 * denominator only exists inside the adapter, and the 5 s refresh owns it.
 */
export function applyLiveDelta(summary: Summary, delta: LiveDelta): Summary {
  if (delta.eventos === 0) return summary

  return {
    ...summary,
    cuentasTrabajadas: summary.cuentasTrabajadas + delta.cuentasNuevas,
    fotosNuevas: summary.fotosNuevas + delta.fotosNuevas,
    fotosActualizadas: summary.fotosActualizadas + delta.fotosActualizadas,
    ubicaciones: summary.ubicaciones + delta.ubicaciones,
    usuariosActivos: summary.usuariosActivos + delta.usuariosNuevos,
  }
}

/**
 * Live contributions received after `since` (a `Date.now()` mark). Deriving the
 * delta this way—instead of resetting state in an effect—keeps the KPIs exact
 * when the authoritative reload already contains the same events.
 */
export function liveDeltaSince(
  items: Array<LiveChange & { recibidoEn: string }>,
  since: number,
  known: KnownSnapshot = {},
): LiveDelta {
  let delta = emptyLiveDelta
  const cuentasNuevas = new Set<string>()
  const usuariosNuevos = new Set<string>()

  for (const item of items) {
    if (new Date(item.recibidoEn).getTime() <= since) continue

    delta = accumulateLive(delta, item)
    if (!known.cuentas?.has(item.cuenta)) cuentasNuevas.add(item.cuenta)
    if (!known.usuarios?.has(item.usuario)) usuariosNuevos.add(item.usuario)
  }

  return { ...delta, cuentasNuevas: cuentasNuevas.size, usuariosNuevos: usuariosNuevos.size }
}

/** Map points pushed after the last load, one per account (the newest wins). */
export function livePointsSince(
  items: Array<LiveChange & { recibidoEn: string }>,
  since: number,
): MapPoint[] {
  const byCuenta = new Map<string, MapPoint>()

  for (const item of items) {
    if (new Date(item.recibidoEn).getTime() <= since) continue
    if (item.lat === undefined || item.lng === undefined) continue

    byCuenta.set(item.cuenta, {
      cuenta: item.cuenta,
      cliente: item.cliente,
      lat: item.lat,
      lng: item.lng,
      tipoCambio: item.tipoCambio,
      usuario: item.usuario,
      fecha: item.fecha,
    })
  }

  return [...byCuenta.values()]
}
