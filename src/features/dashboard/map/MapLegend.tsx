import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import { cn } from '@/lib/utils'
import { PREDIO_ESTADOS_ORDER, PREDIO_ESTADO_STYLES } from './predioStyle'

/**
 * Single source of colours: the map, the charts and this legend agree.
 * It collapses into a chip so it never crowds the map.
 */
export interface MapLegendProps {
  defaultOpen?: boolean
  /** Adds the predio states; shown only while the Predios layer is on. */
  predios?: boolean
}

export function MapLegend({ defaultOpen = true, predios = false }: MapLegendProps) {
  const [open, setOpen] = useState(defaultOpen)

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-surface/92 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg shadow-panel backdrop-blur hover:text-fg"
        aria-expanded={false}
        data-testid="legend-toggle"
      >
        Leyenda
        <ChevronUp className="size-3" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface/92 px-2.5 py-2 shadow-panel backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="mb-1 flex w-full items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg hover:text-fg"
        aria-expanded
        data-testid="legend-toggle"
      >
        Leyenda
        <ChevronDown className="size-3" aria-hidden="true" />
      </button>
      <ul className={cn('flex flex-col gap-1 text-[10px] font-semibold text-muted-fg')}>
        {CHANGE_TYPES.map((tipo) => (
          <li key={tipo} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: CHANGE_TYPE_COLORS[tipo] }}
              data-testid={`legend-${tipo}`}
              aria-hidden="true"
            />
            {CHANGE_TYPE_LABELS[tipo]}
          </li>
        ))}
      </ul>

      {predios ? (
        <section className="mt-2 border-t border-border-subtle pt-1.5" aria-label="Predios">
          <h3 className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">Predios</h3>
          <ul className="flex flex-col gap-1 text-[10px] font-semibold text-muted-fg">
            {PREDIO_ESTADOS_ORDER.map((estado) => (
              <li key={estado} className="flex items-center gap-1.5">
                <span
                  className="size-2.5 rounded-sm border"
                  style={{
                    background: PREDIO_ESTADO_STYLES[estado].fill,
                    borderColor: PREDIO_ESTADO_STYLES[estado].stroke,
                  }}
                  data-testid={`legend-predio-${estado}`}
                  aria-hidden="true"
                />
                {PREDIO_ESTADO_STYLES[estado].label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
