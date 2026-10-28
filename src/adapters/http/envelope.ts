import type { Filters } from '../../domain/types'

/** The API envelope: success is Data, error is Message. Both carry Status/Title. */
export interface ApiEnvelope<T> {
  Status: number | string
  Title: string
  Data?: T
  Message?: string
}

export function toQueryParams(filters: Filters): string {
  const params = new URLSearchParams()

  const entries: Array<[string, string | undefined]> = [
    ['ugestionId', filters.ugestionId],
    ['sucursalId', filters.sucursalId],
    ['filial', filters.filial],
    ['zona', filters.zona],
    ['ruta', filters.ruta],
    ['usuario', filters.usuario],
    ['desde', filters.desde],
    ['hasta', filters.hasta],
    ['tipoCambio', filters.tipoCambio],
  ]

  for (const [key, value] of entries) {
    if (value) params.set(key, value)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export interface EnvelopeParts {
  title: string
  message: string
}

/** Reads Title and Message from an error envelope, tolerating a plain body. */
export function readEnvelopeParts(payload: unknown): EnvelopeParts {
  if (!payload || typeof payload !== 'object') return { title: '', message: '' }

  const envelope = payload as Partial<ApiEnvelope<unknown>>

  return {
    title: typeof envelope.Title === 'string' ? envelope.Title : '',
    message: typeof envelope.Message === 'string' ? envelope.Message : '',
  }
}

/** Unwraps `{ Status, Title, Data }`, keeping a plain payload working too. */
export function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'Data' in payload) {
    return (payload as ApiEnvelope<T>).Data as T
  }

  return payload as T
}
