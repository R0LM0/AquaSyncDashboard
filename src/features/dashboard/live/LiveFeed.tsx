import { Pause, Play, Radio } from 'lucide-react'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '@/domain/labels'
import type { LiveStatus } from '@/ports/DashboardApi'
import { Button } from '@/components/ui/button'
import { formatRelative } from '@/shared/format'
import { cn } from '@/lib/utils'
import type { LiveFeedItem } from '../useLiveChanges'

const STATUS_LABEL: Record<LiveStatus, string> = {
  live: 'En vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión',
}

export interface LiveFeedProps {
  items: LiveFeedItem[]
  status: LiveStatus
  paused: boolean
  onTogglePaused: () => void
  /** Renders without its own card header when embedded in a section. */
  bare?: boolean
}

export function LiveFeed({ items, status, paused, onTogglePaused, bare }: LiveFeedProps) {
  const chipLabel = paused ? 'En pausa' : STATUS_LABEL[status]
  const dot =
    paused || status !== 'live' ? 'bg-warning' : 'bg-success'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-tight text-fg">
            <Radio className="size-4 text-primary" aria-hidden="true" />
            Actividad en vivo
          </h2>
          {!bare ? (
            <p className="text-xs text-muted-fg">Cambios que llegan del campo mientras mirás el tablero</p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg"
            data-testid="live-status"
          >
            <span className={cn('size-2 rounded-full', dot)} aria-hidden="true" />
            {chipLabel}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTogglePaused}
            aria-label={paused ? 'Reanudar la actividad en vivo' : 'Pausar la actividad en vivo'}
          >
            {paused ? <Play /> : <Pause />}
            {paused ? 'Reanudar' : 'Pausar'}
          </Button>
        </div>
      </div>

      <ul className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="live-feed">
        {items.length === 0 ? (
          <li className="py-10 text-center text-sm text-muted-fg">Esperando actividad del personal de campo…</li>
        ) : (
          items.map((item) => (
            <li
              key={`${item.id}-${item.recibidoEn}`}
              className="grid grid-cols-[10px_1fr_auto] items-start gap-2.5 border-b border-border-subtle py-2 last:border-none"
            >
              <span
                className="mt-1.5 size-2.5 rounded-full"
                style={{ background: CHANGE_TYPE_COLORS[item.tipoCambio] }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="truncate text-xs text-fg">
                  <strong className="font-bold">{item.usuario}</strong> · {CHANGE_TYPE_LABELS[item.tipoCambio]}
                </p>
                <p className="truncate text-[11px] text-muted-fg">
                  Cuenta {item.cuenta} · {item.cliente} · {item.ruta}
                </p>
              </div>
              <time className="whitespace-nowrap text-[10px] text-muted-fg" dateTime={item.recibidoEn}>
                {formatRelative(item.recibidoEn)}
              </time>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
