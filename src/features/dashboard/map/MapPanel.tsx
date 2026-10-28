import { useCallback, useMemo, useState } from 'react'
import { useDashboardApi } from '@/app/dashboardApiContext'
import type { MapCenter, MapPoint } from '@/domain/types'
import { ChangesMap } from './ChangesMap'
import { NICARAGUA_BBOX } from './mapLayers'
import {
  readMapPreferences,
  saveMapPreferences,
  type BaseMap,
  type MapPreferences,
} from './mapPreferences'
import { prediosHint, type LayerKey, type MapView } from './mapView'
import { useMapLayers } from './useMapLayers'

export interface MapPanelProps {
  points: MapPoint[]
  highlight?: { lat: number; lng: number; id: string } | null
  height?: number | string
  ugestionId?: string
  sucursalId?: string
  /** True when the filters reach a filial, zona or route: frame those accounts. */
  narrowScope?: boolean
  /** Period of the filters: the predios "trabajado" state is measured on it. */
  desde?: string
  hasta?: string
  /** Where the map starts (Alcance.Mapa of the user), and the label of its control. */
  home?: MapCenter
  homeLabel?: string
  /** Changes only when the filters change: live events must not re-frame the map. */
  fitKey?: string
  onSelectAccount: (cuenta: string) => void
}

const DEFAULT_VIEW: MapView = { bbox: NICARAGUA_BBOX, zoom: 7 }

function sameView(left: MapView, right: MapView): boolean {
  return (
    left.zoom === right.zoom &&
    Math.abs(left.bbox.minLng - right.bbox.minLng) < 0.00005 &&
    Math.abs(left.bbox.minLat - right.bbox.minLat) < 0.00005 &&
    Math.abs(left.bbox.maxLng - right.bbox.maxLng) < 0.00005 &&
    Math.abs(left.bbox.maxLat - right.bbox.maxLat) < 0.00005
  )
}

export function MapPanel({
  points,
  highlight,
  height = 420,
  ugestionId,
  sucursalId,
  narrowScope = false,
  desde,
  hasta,
  home,
  homeLabel,
  fitKey = 'initial',
  onSelectAccount,
}: MapPanelProps) {
  const api = useDashboardApi()
  const [preferences, setPreferences] = useState<MapPreferences>(() => readMapPreferences())
  const [view, setView] = useState<MapView>(DEFAULT_VIEW)

  const layers = useMapLayers({
    api,
    ugestionId,
    sucursalId,
    desde,
    hasta,
    view,
    prediosEnabled: preferences.visible.predios,
  })

  const handleViewChange = useCallback((next: MapView) => {
    setView((current) => (sameView(current, next) ? current : next))
  }, [])

  const updatePreferences = useCallback((next: MapPreferences) => {
    setPreferences(next)
    saveMapPreferences(next)
  }, [])

  const toggleLayer = useCallback(
    (key: LayerKey) => {
      updatePreferences({
        ...preferences,
        visible: { ...preferences.visible, [key]: !preferences.visible[key] },
      })
    },
    [preferences, updatePreferences],
  )

  const changeBaseMap = useCallback(
    (baseMap: BaseMap) => updatePreferences({ ...preferences, baseMap }),
    [preferences, updatePreferences],
  )

  const hint = useMemo(
    () =>
      preferences.visible.predios
        ? prediosHint(view.zoom, layers.truncated, layers.predios?.message)
        : null,
    [preferences.visible.predios, view.zoom, layers.truncated, layers.predios?.message],
  )

  return (
    <div className="relative">
      <ChangesMap
        points={points}
        highlight={highlight}
        height={height}
        layers={{
          ugestiones: layers.ugestiones,
          sucursales: layers.sucursales,
          predios: layers.predios,
        }}
        visible={preferences.visible}
        baseMap={preferences.baseMap}
        onBaseMapChange={changeBaseMap}
        onToggleLayer={toggleLayer}
        view={view}
        ugestionId={ugestionId}
        sucursalId={sucursalId}
        narrowScope={narrowScope}
        fitKey={fitKey}
        home={home}
        homeLabel={homeLabel}
        onViewChange={handleViewChange}
        onSelectAccount={onSelectAccount}
      />

      {hint ? (
        <p
          className="absolute bottom-[46px] left-1/2 z-[700] -translate-x-1/2 rounded-full border border-accent/40 bg-accent/15 px-3 py-1.5 text-[11px] font-bold text-accent shadow-panel backdrop-blur"
          data-testid="predios-hint"
          role="status"
        >
          {hint}
        </p>
      ) : null}

      {layers.prediosLoading ? (
        <p
          className="absolute bottom-[82px] left-1/2 z-[700] -translate-x-1/2 rounded-full border border-border-subtle bg-surface/95 px-3 py-1 text-[11px] font-semibold text-muted-fg shadow-panel"
          data-testid="predios-loading"
        >
          Cargando predios…
        </p>
      ) : null}
    </div>
  )
}
