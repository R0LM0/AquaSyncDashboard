import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { CoverageAccount, CoverageEstado } from '@/domain/types'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/shared/format'
import { cn } from '@/lib/utils'
import { EmptyState } from '../EmptyState'
import { ESTADO_LABELS, filterCoverageAccounts } from './coverageAggregates'
import { googleMapsSearchUrl } from './coverageLayers'

/** Pendientes and Trabajadas always; Fuera de ruta only when there is any. */
function visibleTabs(accounts: CoverageAccount[]): CoverageEstado[] {
  const tabs: CoverageEstado[] = ['pendiente', 'trabajada']
  if (accounts.some((account) => account.estado === 'fuera_de_ruta')) tabs.push('fuera_de_ruta')
  return tabs
}

/** Accent-insensitive and case-insensitive, so a search for "perez" finds "Pérez". */
function dateCell(iso: string | null): string {
  return iso ? formatDateTime(iso) : '—'
}

/** Ubicar and the Google Maps link for an account with coordinates; a plain note otherwise. */
function MapCell({ account, onLocate }: { account: CoverageAccount; onLocate: (account: CoverageAccount) => void }) {
  if (account.lat === null || account.lng === null) {
    return <span className="text-xs text-muted-fg">Sin ubicación</span>
  }

  const mapsUrl = googleMapsSearchUrl(account.lat, account.lng)
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      <button
        type="button"
        aria-label={`Ubicar la cuenta ${account.cuenta} en el mapa`}
        onClick={() => onLocate(account)}
        className="rounded-md bg-surface-2 px-2 py-1 font-bold text-fg hover:bg-surface-3"
      >
        Ubicar
      </button>
      {mapsUrl ? (
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
          Google Maps
        </a>
      ) : null}
    </span>
  )
}

export function CoverageTables({
  accounts,
  onLocate,
}: {
  accounts: CoverageAccount[]
  /** Flies the coverage map to the account and opens its popup. */
  onLocate: (account: CoverageAccount) => void
}) {
  const tabs = useMemo(() => visibleTabs(accounts), [accounts])
  const [requested, setRequested] = useState<CoverageEstado>('pendiente')
  const [query, setQuery] = useState('')
  const tab = tabs.includes(requested) ? requested : 'pendiente'
  const worked = tab !== 'pendiente'

  const rows = useMemo(() => filterCoverageAccounts(accounts, tab, query), [accounts, tab, query])

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Estado de las cuentas"
          className="inline-flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1"
        >
          {tabs.map((estado) => {
            const count = accounts.filter((account) => account.estado === estado).length
            const selected = estado === tab
            return (
              <button
                key={estado}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setRequested(estado)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
                  selected ? 'bg-surface text-fg shadow-sm' : 'text-muted-fg hover:text-fg',
                )}
              >
                {ESTADO_LABELS[estado]} <span className="tabular-nums">({count})</span>
              </button>
            )
          })}
        </div>
        <div className="sm:w-72">
          <Input
            aria-label="Buscar por cuenta, cliente o dirección"
            placeholder="Cuenta, N° catastral, cliente o dirección"
            icon={<Search className="size-4" aria-hidden="true" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={query ? 'Ninguna cuenta coincide con la búsqueda' : 'Sin cuentas en esta lista'} />
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-muted-fg">
                <th className="border-b border-border-subtle px-2 py-2">Cuenta</th>
                <th className="border-b border-border-subtle px-2 py-2">N° catastral</th>
                <th className="border-b border-border-subtle px-2 py-2">Cliente</th>
                <th className="border-b border-border-subtle px-2 py-2">Dirección</th>
                {worked ? (
                  <>
                    <th className="border-b border-border-subtle px-2 py-2">Usuario</th>
                    <th className="border-b border-border-subtle px-2 py-2">Primera actividad</th>
                    <th className="border-b border-border-subtle px-2 py-2">Última actividad</th>
                    <th className="border-b border-border-subtle px-2 py-2 text-right">Fotos</th>
                    <th className="border-b border-border-subtle px-2 py-2 text-right">Ubicaciones</th>
                  </>
                ) : null}
                <th className="border-b border-border-subtle px-2 py-2">Mapa</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => (
                <tr key={account.cuenta} className="transition-colors hover:bg-surface-2/70">
                  <td className="border-b border-border-subtle px-2 py-2 text-xs font-semibold tabular-nums text-fg">
                    {account.cuenta}
                  </td>
                  <td className="border-b border-border-subtle px-2 py-2 text-xs tabular-nums text-fg">
                    {account.numeroCatastral || '—'}
                  </td>
                  <td className="border-b border-border-subtle px-2 py-2 text-xs text-fg">{account.cliente || '—'}</td>
                  <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">
                    {account.direccion || '—'}
                  </td>
                  {worked ? (
                    <>
                      <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">
                        {account.usuario ?? '—'}
                      </td>
                      <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">
                        {dateCell(account.primeraActividad)}
                      </td>
                      <td className="border-b border-border-subtle px-2 py-2 text-xs text-muted-fg">
                        {dateCell(account.ultimaActividad)}
                      </td>
                      <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                        {account.fotos}
                      </td>
                      <td className="border-b border-border-subtle px-2 py-2 text-right text-xs tabular-nums text-fg">
                        {account.ubicaciones}
                      </td>
                    </>
                  ) : null}
                  <td className="border-b border-border-subtle px-2 py-2">
                    <MapCell account={account} onLocate={onLocate} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
