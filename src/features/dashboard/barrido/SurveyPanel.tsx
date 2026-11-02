import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, ExternalLink, ImageOff, Images, MapPin, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDashboardApi } from '@/app/dashboardApiContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isForbidden, isNotFound, isSessionExpired } from '@/domain/errors'
import type { BarridoEncuestaDetalle } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { formatDateTime } from '@/shared/format'
import { cn } from '@/lib/utils'
import { coordinatesText, googleMapsUrl } from '../map/mapView'

type PhotoState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'missing' }
  | { status: 'error' }

export type SurveyDetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; detail: BarridoEncuestaDetalle; photo: PhotoState }
  | { status: 'forbidden' }
  | { status: 'notfound' }
  | { status: 'error'; error: string }

interface Loaded {
  id: string
  state: SurveyDetailState
}

/**
 * Loads the survey of the open panel and then its photo, as a blob of the authenticated request turned into an
 * object URL. The URL is revoked when the panel closes or switches survey; a stale answer never replaces the
 * current survey.
 */
function useSurveyDetail(
  api: DashboardApi,
  id: string | null,
  onSessionExpired?: () => void,
): SurveyDetailState {
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!id) return

    const controller = new AbortController()
    let objectUrl: string | null = null
    const publish = (state: SurveyDetailState) => {
      if (!controller.signal.aborted) setLoaded({ id, state })
    }
    const fail = (error: unknown) => {
      if (controller.signal.aborted) return
      if (isSessionExpired(error)) return onSessionExpired?.()
      if (isForbidden(error)) return publish({ status: 'forbidden' })
      if (isNotFound(error)) return publish({ status: 'notfound' })
      publish({
        status: 'error',
        error: error instanceof Error ? error.message : 'No se pudo cargar la encuesta',
      })
    }

    api
      .barridoEncuesta(id, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return
        if (!detail.tieneFoto) {
          publish({ status: 'ready', detail, photo: { status: 'none' } })
          return
        }

        publish({ status: 'ready', detail, photo: { status: 'loading' } })
        return api
          .barridoEncuestaFoto(id, controller.signal)
          .then((blob) => {
            if (controller.signal.aborted) return
            objectUrl = URL.createObjectURL(blob)
            publish({ status: 'ready', detail, photo: { status: 'ready', url: objectUrl } })
          })
          .catch((error: unknown) => {
            if (controller.signal.aborted) return
            if (isSessionExpired(error)) return onSessionExpired?.()
            publish({
              status: 'ready',
              detail,
              photo: { status: isNotFound(error) ? 'missing' : 'error' },
            })
          })
      })
      .catch(fail)

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [api, id, onSessionExpired])

  if (!id) return { status: 'idle' }
  if (!loaded || loaded.id !== id) return { status: 'loading' }
  return loaded.state
}

export interface SurveyPanelProps {
  /** referenciaId of the survey; null while closed. */
  surveyId: string | null
  open: boolean
  onClose: () => void
  onSessionExpired?: () => void
}

/** Survey detail with its photo. Same dialog as the cadastral account panel (side sheet, bottom sheet on phones). */
export function SurveyPanel({ surveyId, open, onClose, onSessionExpired }: SurveyPanelProps) {
  const api = useDashboardApi()
  const state = useSurveyDetail(api, surveyId, onSessionExpired)

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
          data-testid="survey-panel"
        >
          <Dialog.Title className="sr-only">Detalle de la encuesta {surveyId ?? ''}</Dialog.Title>

          <header className="flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-fg">Encuesta de barrido</p>
              <p className="truncate text-lg font-extrabold tracking-tight text-fg">
                {state.status === 'ready' ? `Cuenta ${state.detail.cuenta}` : `N.º ${surveyId ?? '—'}`}
              </p>
            </div>
            <Dialog.Close asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="Cerrar el panel">
                <X />
              </Button>
            </Dialog.Close>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {state.status === 'loading' || state.status === 'idle' ? <SurveySkeleton /> : null}

            {state.status === 'notfound' ? (
              <Notice title="Encuesta no encontrada" detail={`La encuesta ${surveyId} ya no existe.`} />
            ) : null}

            {state.status === 'forbidden' ? (
              <Notice title="Sin acceso" detail="La encuesta está fuera de su alcance." />
            ) : null}

            {state.status === 'error' ? (
              <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            ) : null}

            {state.status === 'ready' ? <SurveyBody detail={state.detail} photo={state.photo} /> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Notice({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center" role="alert">
      <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted-fg">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-bold text-fg">{title}</p>
      <p className="max-w-[240px] text-xs text-muted-fg">{detail}</p>
    </div>
  )
}

function SurveySkeleton() {
  return (
    <div className="space-y-4" data-testid="survey-panel-skeleton" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

function yesNo(value: boolean): string {
  return value ? 'Sí' : 'No'
}

function SurveyBody({ detail, photo }: { detail: BarridoEncuestaDetalle; photo: PhotoState }) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="truncate text-base font-bold text-fg">{detail.cliente || 'Sin cliente'}</h3>
        <p className="text-xs text-muted-fg">
          N.º catastral <span className="font-semibold text-fg">{detail.catastro || '—'}</span>
        </p>
        <p className="text-xs text-muted-fg">Levantada el {formatDateTime(detail.fecha)}</p>
        <div className="flex flex-wrap gap-1.5">
          {detail.estadoAdm ? <Badge tone="primary">{detail.estadoAdm}</Badge> : null}
          {detail.rubro ? <Badge tone="neutral">{detail.rubro}</Badge> : null}
          {detail.tarifa ? <Badge tone="neutral">Tarifa {detail.tarifa}</Badge> : null}
        </div>
      </section>

      <section className="space-y-2">
        <SectionTitle icon={Images} title="Foto" />
        <SurveyPhoto photo={photo} cuenta={detail.cuenta} />
      </section>

      <section className="space-y-2">
        <SectionTitle icon={MapPin} title="Ubicación" />
        <p className="text-xs text-fg">{detail.direccion || 'Sin dirección registrada'}</p>
        {detail.lat !== null && detail.lng !== null ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border-subtle bg-surface-2/60 px-2.5 py-2">
            <code className="text-[11px] font-semibold text-fg">{coordinatesText(detail.lat, detail.lng)}</code>
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
        ) : null}
      </section>

      <section className="space-y-2">
        <SectionTitle icon={MapPin} title="Características" />
        <dl className="grid grid-cols-2 gap-2 text-xs" data-testid="survey-features">
          <Info label="Jardín" value={yesNo(detail.jardin)} />
          <Info label="Piscina" value={yesNo(detail.piscina)} />
          <Info label="Tanque" value={detail.tanque ? `Sí (${detail.tanqueM} m³)` : 'No'} />
          <Info label="Planta en piso" value={yesNo(detail.plantaPiso)} />
        </dl>
        <p className="text-xs text-muted-fg">
          Observación: <span className="text-fg">{detail.observacion || 'Sin observación'}</span>
        </p>
      </section>
    </div>
  )
}

function SurveyPhoto({ photo, cuenta }: { photo: PhotoState; cuenta: string }) {
  if (photo.status === 'loading') {
    return <Skeleton className="aspect-[4/3] w-full" data-testid="survey-photo-loading" />
  }

  if (photo.status === 'ready') {
    return (
      <img
        src={photo.url}
        alt={`Foto de la encuesta de la cuenta ${cuenta}`}
        className="max-h-[360px] w-full rounded-xl border border-border-subtle bg-surface-2 object-contain"
        data-testid="survey-photo"
      />
    )
  }

  const text =
    photo.status === 'error'
      ? { title: 'No se pudo cargar la foto', detail: 'Cerrá y volvé a abrir la encuesta para reintentar.' }
      : { title: 'Sin foto', detail: 'Esta encuesta no tiene foto cargada.' }

  return (
    <div
      className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-border-subtle py-6 text-center"
      role={photo.status === 'error' ? 'alert' : undefined}
      data-testid="survey-photo-empty"
    >
      <ImageOff className="size-5 text-muted-fg" aria-hidden="true" />
      <p className="text-xs font-semibold text-fg">{text.title}</p>
      <p className="text-[11px] text-muted-fg">{text.detail}</p>
    </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-surface-2/50 px-2 py-1.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-fg">{label}</dt>
      <dd className="truncate text-xs font-semibold text-fg">{value}</dd>
    </div>
  )
}
