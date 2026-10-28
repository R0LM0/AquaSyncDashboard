import * as Dialog from '@radix-ui/react-dialog'
import {
  AlertTriangle,
  Building2,
  ClipboardCopy,
  ExternalLink,
  Gauge,
  History,
  ImageOff,
  Images,
  MapPin,
  Receipt,
  Wifi,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { currentApiUrl } from '@/app/apiUrl'
import { useDashboardApi } from '@/app/dashboardApiContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipProvider } from '@/components/ui/tooltip'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '@/domain/labels'
import type { AccountDetail, AccountPhoto } from '@/domain/types'
import { formatDateTime } from '@/shared/format'
import { cn } from '@/lib/utils'
import {
  coordinatesText,
  googleMapsUrl,
  photoSrc,
} from '../map/mapView'
import { useAccountDetail } from './useAccountDetail'

export interface AccountPanelProps {
  cuenta: string | null
  open: boolean
  onClose: () => void
  onSessionExpired?: () => void
  /** Test override; the app uses the resolved API base. */
  apiBase?: string
}

export function AccountPanel({ cuenta, open, onClose, onSessionExpired, apiBase }: AccountPanelProps) {
  const api = useDashboardApi()
  const state = useAccountDetail(api, cuenta, onSessionExpired)
  const base = apiBase ?? currentApiUrl()

  return (
    <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-fade-in md:bg-black/30" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col overflow-hidden border border-border-subtle bg-surface shadow-panel',
            'rounded-t-2xl data-[state=open]:animate-sheet-up',
            'md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:rounded-l-2xl md:rounded-tr-none',
            'md:data-[state=open]:animate-slide-in-right focus:outline-none',
          )}
          aria-describedby={undefined}
          data-testid="account-panel"
        >
          <Dialog.Title className="sr-only">
            Detalle de la cuenta {cuenta ?? ''}
          </Dialog.Title>

          <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">
                Cuenta
              </p>
              <p className="truncate text-lg font-extrabold tracking-tight text-fg">
                {cuenta ?? '—'}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Cerrar el panel">
                <X />
              </Button>
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {state.status === 'loading' || state.status === 'idle' ? <PanelSkeleton /> : null}

            {state.status === 'notfound' ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center" role="alert">
                <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted-fg">
                  <AlertTriangle className="size-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-fg">Cuenta no encontrada</p>
                <p className="max-w-[240px] text-xs text-muted-fg">
                  La cuenta {cuenta} no existe en el catálogo comercial de SIGIL.
                </p>
              </div>
            ) : null}

            {state.status === 'error' ? (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            ) : null}

            {state.status === 'ready' && state.detail ? (
              <DetailBody detail={state.detail} apiBase={base} />
            ) : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PanelSkeleton() {
  return (
    <div className="space-y-4" data-testid="account-panel-skeleton" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/3] w-full" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

function DetailBody({ detail, apiBase }: { detail: AccountDetail; apiBase: string }) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="truncate text-base font-bold text-fg">{detail.cliente || 'Sin cliente'}</h3>
        <p className="text-xs text-muted-fg">
          N.º catastral <span className="font-semibold text-fg">{detail.numeroCatastral || '—'}</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone={detail.estado === 'A' ? 'success' : 'neutral'} data-testid="badge-conexion">
            <Wifi className="size-3" aria-hidden="true" />
            {detail.estado === 'A' ? 'Con conexión' : 'Sin conexión'}
          </Badge>
          <Badge tone={detail.estadoAdministrativo === 'A' ? 'primary' : 'warning'}>
            <Receipt className="size-3" aria-hidden="true" />
            {detail.estadoAdministrativo === 'A' ? 'Administrativo al día' : 'Administrativo pendiente'}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-xs">
          <Info icon={Gauge} label="Tipo de servicio" value={detail.tipoServicio || '—'} />
          <Info icon={Building2} label="Medidor" value={detail.medidor || '—'} />
        </dl>
      </section>

      <section className="space-y-2">
        <SectionTitle icon={MapPin} title="Ubicación" />
        <p className="text-xs text-fg">{detail.direccion || 'Sin dirección registrada'}</p>
        <dl className="grid grid-cols-2 gap-2 text-xs">
          <Info icon={Building2} label="Unidad de gestión" value={detail.ugestionNombre || '—'} />
          <Info icon={Building2} label="Sucursal" value={detail.sucursalNombre || '—'} />
          <Info icon={MapPin} label="Filial / zona / ruta" value={[detail.filial, detail.zona, detail.ruta].filter(Boolean).join(' · ') || '—'} />
        </dl>

        {detail.lat !== undefined && detail.lng !== undefined ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-2/60 px-2.5 py-2">
            <code className="text-[11px] font-semibold text-fg">
              {coordinatesText(detail.lat, detail.lng)}
            </code>
            <CopyCoordinates lat={detail.lat} lng={detail.lng} />
            <a
              href={googleMapsUrl(detail.lat, detail.lng)}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              Abrir en Google Maps
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        ) : (
          <p className="text-xs text-muted-fg">La cuenta no tiene coordenadas registradas.</p>
        )}
      </section>

      <Photos detail={detail} apiBase={apiBase} />

      <section className="space-y-2">
        <SectionTitle icon={History} title={`Historial (${detail.historial.length})`} />
        {detail.historial.length === 0 ? (
          <p className="text-xs text-muted-fg">Sin cambios registrados para esta cuenta.</p>
        ) : (
          <ol className="relative ml-1 border-l border-border-subtle pl-4" data-testid="account-history">
            {detail.historial.map((entry) => (
              <li key={entry.id} className="relative pb-3 last:pb-0">
                <span
                  className="absolute -left-[21px] top-1 size-2.5 rounded-full ring-2 ring-surface"
                  style={{ background: CHANGE_TYPE_COLORS[entry.tipoCambio] }}
                  aria-hidden="true"
                />
                <p className="text-[11px] font-bold text-fg">
                  {formatDateTime(entry.fecha)} · {entry.usuario}
                </p>
                <p className="text-[11px] text-muted-fg">
                  {CHANGE_TYPE_LABELS[entry.tipoCambio]} · {entry.origen || '—'}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

function Photos({ detail, apiBase }: { detail: AccountDetail; apiBase: string }) {
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [viewer, setViewer] = useState<AccountPhoto | null>(null)

  if (detail.fotos.length === 0) {
    return (
      <section className="space-y-2">
        <SectionTitle icon={Images} title="Fotos" />
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border-subtle py-6 text-center">
          <ImageOff className="size-5 text-muted-fg" aria-hidden="true" />
          <p className="text-xs font-semibold text-fg">Sin fotos</p>
          <p className="text-[11px] text-muted-fg">Esta cuenta todavía no tiene evidencia cargada.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-2">
      <SectionTitle icon={Images} title={`Fotos (${detail.fotos.length})`} />
      <ul className="grid grid-cols-3 gap-2" data-testid="account-photos">
        {detail.fotos.map((photo) => (
          <li key={photo.adjuntoId}>
            <button
              type="button"
              onClick={() => setViewer(photo)}
              className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg border border-border-subtle bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary"
              aria-label={`Ver ${photo.tipoNombre || 'foto'} de la cuenta ${detail.cuenta}`}
            >
              {!loaded[photo.adjuntoId] ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
              <img
                src={photoSrc(photo.urlImagen, apiBase)}
                alt={photo.descripcion || photo.tipoNombre}
                loading="lazy"
                className={cn(
                  'h-full w-full object-cover transition-opacity',
                  loaded[photo.adjuntoId] ? 'opacity-100' : 'opacity-0',
                )}
                onLoad={() => setLoaded((current) => ({ ...current, [photo.adjuntoId]: true }))}
                onError={() => setLoaded((current) => ({ ...current, [photo.adjuntoId]: true }))}
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog.Root open={Boolean(viewer)} onOpenChange={(next) => (next ? undefined : setViewer(null))}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm data-[state=open]:animate-fade-in" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[70] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border-subtle bg-surface p-3 shadow-panel focus:outline-none">
            <Dialog.Title className="mb-2 text-sm font-bold text-fg">
              {viewer?.tipoNombre || 'Foto'} · cuenta {detail.cuenta}
            </Dialog.Title>
            {viewer ? (
              <img
                src={photoSrc(viewer.urlImagen, apiBase)}
                alt={viewer.descripcion || viewer.tipoNombre}
                className="max-h-[70vh] w-full rounded-xl object-contain"
                data-testid="photo-viewer"
              />
            ) : null}
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-fg">{viewer?.descripcion}</p>
              <Dialog.Close asChild>
                <Button type="button" variant="secondary" size="sm">
                  Cerrar
                </Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  )
}

function CopyCoordinates({ lat, lng }: { lat: number; lng: number }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = useCallback(() => {
    const text = coordinatesText(lat, lng)
    const done = () => {
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1600)
    }

    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(text).then(done).catch(done)
      return
    }
    done()
  }, [lat, lng])

  return (
    <TooltipProvider>
      <Tooltip content={copied ? 'Coordenadas copiadas' : 'Copiar coordenadas'}>
        <Button type="button" variant="ghost" size="sm" onClick={copy} aria-label="Copiar coordenadas">
          <ClipboardCopy />
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </Tooltip>
    </TooltipProvider>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: typeof MapPin; title: string }) {
  return (
    <h3 className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-fg">
      <Icon className="size-3" aria-hidden="true" />
      {title}
    </h3>
  )
}

function Info({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2/50 px-2 py-1.5">
      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-fg">
        <Icon className="size-3" aria-hidden="true" />
        {label}
      </dt>
      <dd className="truncate text-xs font-semibold text-fg">{value}</dd>
    </div>
  )
}
