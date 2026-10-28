import { Menu, RefreshCw, Radio } from 'lucide-react'
import type { LiveStatus } from '@/ports/DashboardApi'
import type { RuntimeEnvironment } from '@/app/runtimeEnvironment'
import { EnvironmentChip } from '@/components/EnvironmentChip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LIVE_LABEL: Record<LiveStatus, string> = {
  live: 'En vivo',
  reconnecting: 'Reconectando…',
  offline: 'Sin conexión',
}

export interface TopbarProps {
  title: string
  environment?: RuntimeEnvironment
  liveStatus: LiveStatus
  livePaused: boolean
  loading: boolean
  onRefresh: () => void
  onOpenMenu: () => void
}

export function Topbar({
  title,
  environment,
  liveStatus,
  livePaused,
  loading,
  onRefresh,
  onOpenMenu,
}: TopbarProps) {
  const liveTone = livePaused ? 'bg-muted-fg' : liveStatus === 'live' ? 'bg-success' : 'bg-warning'

  return (
    <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg/85 px-4 py-3 backdrop-blur-md sm:px-6 no-print">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
        >
          <Menu />
        </Button>

        <div className="min-w-0">
          <nav aria-label="Ubicación" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-fg">
            SIGIL <span aria-hidden="true">/</span> Catastro
          </nav>
          <h1 className="truncate text-lg font-extrabold tracking-tight text-fg">{title}</h1>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-muted-fg"
            data-testid="live-status-topbar"
          >
            <span className={cn('size-2 rounded-full', liveTone)} aria-hidden="true" />
            {livePaused ? 'En pausa' : LIVE_LABEL[liveStatus]}
          </span>

          <EnvironmentChip environment={environment} />

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            aria-label="Actualizar datos"
            disabled={loading}
          >
            <RefreshCw className={loading ? 'animate-spin' : undefined} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <Radio className="hidden size-4 text-muted-fg sm:block" aria-hidden="true" />
        </div>
      </div>
    </header>
  )
}
