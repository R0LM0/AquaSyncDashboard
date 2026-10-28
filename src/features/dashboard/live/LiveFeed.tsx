import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '../../../domain/labels'
import type { ChangeType } from '../../../domain/types'
import { formatRelative } from '../../../shared/format'
import { Panel } from '../../../components/Panel'
import type { LiveFeedItem } from '../useLiveChanges'
import type { LiveStatus } from '../../../ports/DashboardApi'

const statusLabels: Record<LiveStatus, string> = {
  live: 'En vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión',
}

export interface LiveFeedProps {
  items: LiveFeedItem[]
  status: LiveStatus
  paused: boolean
  onTogglePaused: () => void
}

export function LiveFeed({ items, status, paused, onTogglePaused }: LiveFeedProps) {
  const chipLabel = paused ? 'En pausa' : statusLabels[status]
  const chipClass = paused ? 'chip--paused' : `chip--${status}`

  return (
    <Panel
      title="Actividad en vivo"
      description="Cambios que llegan del campo mientras mirás el tablero"
      actions={
        <div className="live__actions">
          <span className={`chip ${chipClass}`} data-testid="live-status">
            <span className="chip__dot" aria-hidden="true" />
            {chipLabel}
          </span>
          <button type="button" className="button button--ghost" onClick={onTogglePaused}>
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
        </div>
      }
    >
      <ul className="feed" data-testid="live-feed">
        {items.length === 0 ? (
          <li className="feed__empty">Esperando actividad del personal de campo…</li>
        ) : (
          items.map((item) => <FeedRow key={`${item.id}-${item.recibidoEn}`} item={item} />)
        )}
      </ul>
    </Panel>
  )
}

function FeedRow({ item }: { item: LiveFeedItem }) {
  return (
    <li className="feed__item">
      <span
        className="feed__dot"
        style={{ background: CHANGE_TYPE_COLORS[item.tipoCambio as ChangeType] }}
        aria-hidden="true"
      />
      <div className="feed__content">
        <p className="feed__title">
          <strong>{item.usuario}</strong> · {CHANGE_TYPE_LABELS[item.tipoCambio]}
        </p>
        <p className="feed__meta">
          Cuenta {item.cuenta} · {item.cliente} · {item.ruta}
        </p>
      </div>
      <time className="feed__time" dateTime={item.recibidoEn}>
        {formatRelative(item.recibidoEn)}
      </time>
    </li>
  )
}
