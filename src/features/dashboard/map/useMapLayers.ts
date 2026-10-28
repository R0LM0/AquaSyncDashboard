import { useEffect, useMemo, useState } from 'react'
import type {
  MapLayer,
  PredioLayerProperties,
  SucursalLayerProperties,
  UgestionLayerProperties,
} from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { shouldLoadPredios, type MapView } from './mapView'

/** The API ignores a sub-second pan; 300 ms keeps the map responsive. */
export const PREDIOS_DEBOUNCE_MS = 300

export interface UseMapLayersOptions {
  api: DashboardApi
  ugestionId?: string
  sucursalId?: string
  view: MapView
  /** The Predios checkbox, so a disabled layer never hits the API. */
  prediosEnabled: boolean
}

export interface MapLayersState {
  ugestiones?: MapLayer<UgestionLayerProperties>
  sucursales?: MapLayer<SucursalLayerProperties>
  predios?: MapLayer<PredioLayerProperties>
  prediosLoading: boolean
  zoomHint: string | null
  truncated: boolean
}

/**
 * Administrative layers load once per filter and are cached by the adapter;
 * lots reload on every settled move, debounced and with the previous request
 * cancelled so a fast pan never paints stale geometry.
 */
export function useMapLayers({
  api,
  ugestionId,
  sucursalId,
  view,
  prediosEnabled,
}: UseMapLayersOptions): MapLayersState {
  const [ugestiones, setUgestiones] = useState<MapLayer<UgestionLayerProperties>>()
  const [sucursales, setSucursales] = useState<MapLayer<SucursalLayerProperties>>()
  const [predios, setPredios] = useState<MapLayer<PredioLayerProperties>>()
  const [prediosLoading, setPrediosLoading] = useState(false)

  const bboxKey = useMemo(
    () =>
      [view.bbox.minLng, view.bbox.minLat, view.bbox.maxLng, view.bbox.maxLat]
        .map((value) => value.toFixed(4))
        .join(','),
    [view.bbox],
  )
  const zoom = view.zoom

  useEffect(() => {
    const controller = new AbortController()

    Promise.all([
      api.layerUgestiones(ugestionId, controller.signal),
      api.layerSucursales(ugestionId, controller.signal),
    ])
      .then(([nextUgestiones, nextSucursales]) => {
        if (controller.signal.aborted) return
        setUgestiones(nextUgestiones)
        setSucursales(nextSucursales)
      })
      .catch(() => {
        /* aborted or unavailable: the map keeps the previous layers */
      })

    return () => controller.abort()
  }, [api, ugestionId])

  useEffect(() => {
    if (!prediosEnabled || !shouldLoadPredios(zoom)) return

    const [minLng, minLat, maxLng, maxLat] = bboxKey.split(',').map(Number)
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setPrediosLoading(true)
      api
        .layerPredios(
          { bbox: { minLng, minLat, maxLng, maxLat }, zoom, ugestionId, sucursalId },
          controller.signal,
        )
        .then((layer) => {
          if (controller.signal.aborted) return
          setPredios(layer)
          setPrediosLoading(false)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setPrediosLoading(false)
        })
    }, PREDIOS_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [api, bboxKey, zoom, ugestionId, sucursalId, prediosEnabled])

  // Only what the current view is allowed to show: derived, never stored.
  const allowed = prediosEnabled && shouldLoadPredios(zoom)
  const visiblePredios = allowed ? predios : undefined

  return {
    ugestiones,
    sucursales,
    predios: visiblePredios,
    prediosLoading: allowed && prediosLoading,
    zoomHint: prediosEnabled && !shouldLoadPredios(zoom) ? 'Acerque el mapa para ver predios' : null,
    truncated: Boolean(visiblePredios?.truncated),
  }
}
