import * as Popover from '@radix-ui/react-popover'
import { Check, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BASE_LAYERS } from './mapLayers'
import { LAYER_LABELS, PREDIOS_MIN_ZOOM, type LayerKey } from './mapView'
import type { BaseMap } from './mapPreferences'

export interface MapLayersPopoverProps {
  baseMap: BaseMap
  onBaseMapChange: (baseMap: BaseMap) => void
  visible: Record<LayerKey, boolean>
  onToggleLayer: (key: LayerKey) => void
  zoom: number
}

const GROUPS: Array<{ title: string; keys: LayerKey[] }> = [
  { title: 'Límites', keys: ['ugestiones', 'sucursales'] },
  { title: 'Catastro', keys: ['predios'] },
  { title: 'Trabajo de campo', keys: ['cambios'] },
]

/** One control for base map and layers, grouped by what they mean. */
export function MapLayersPopover({
  baseMap,
  onBaseMapChange,
  visible,
  onToggleLayer,
  zoom,
}: MapLayersPopoverProps) {
  const prediosAvailable = zoom >= PREDIOS_MIN_ZOOM

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="grid size-9 place-items-center rounded-lg border border-border-subtle bg-surface/95 text-fg shadow-panel hover:text-primary data-[state=open]:border-primary data-[state=open]:text-primary"
          aria-label="Capas del mapa"
          title="Capas del mapa"
        >
          <Layers className="size-4" aria-hidden="true" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={8}
          className="z-[600] w-60 rounded-xl border border-border-subtle bg-surface p-3 text-xs shadow-panel data-[state=open]:animate-fade-in"
          data-testid="map-layers-popover"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <div className="space-y-3">
            <fieldset>
              <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-fg">
                Mapa base
              </legend>
              <ul className="flex flex-col gap-1">
                {(Object.keys(BASE_LAYERS) as BaseMap[]).map((key) => (
                  <li key={key}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 font-semibold text-fg hover:bg-surface-2">
                      <input
                        type="radio"
                        name="mapa-base"
                        className="size-3.5 accent-[hsl(var(--primary))]"
                        checked={baseMap === key}
                        onChange={() => onBaseMapChange(key)}
                        aria-label={BASE_LAYERS[key].name}
                      />
                      {BASE_LAYERS[key].name}
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>

            {GROUPS.map((group) => (
              <fieldset key={group.title}>
                <legend className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-fg">
                  {group.title}
                </legend>
                <ul className="flex flex-col gap-1">
                  {group.keys.map((key) => {
                    const disabled = key === 'predios' && !prediosAvailable
                    return (
                      <li key={key}>
                        <label
                          className={cn(
                            'flex items-start gap-2 rounded-lg px-1 py-1 font-semibold',
                            disabled
                              ? 'cursor-not-allowed text-muted-fg/60'
                              : 'cursor-pointer text-fg hover:bg-surface-2',
                          )}
                        >
                          <span className="relative mt-0.5 grid size-3.5 shrink-0 place-items-center rounded border border-border-subtle bg-surface-2">
                            {visible[key] ? (
                              <Check className="size-3 text-primary" aria-hidden="true" />
                            ) : null}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={visible[key]}
                            disabled={disabled}
                            onChange={() => onToggleLayer(key)}
                            aria-label={LAYER_LABELS[key]}
                          />
                          <span className="min-w-0">
                            {LAYER_LABELS[key]}
                            {disabled ? (
                              <span className="block text-[10px] font-medium text-muted-fg">
                                Visible desde zoom {PREDIOS_MIN_ZOOM}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              </fieldset>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
