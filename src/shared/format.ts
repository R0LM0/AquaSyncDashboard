const dateTimeFormatter = new Intl.DateTimeFormat('es-NI', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('es-NI', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const numberFormatter = new Intl.NumberFormat('es-NI')

export function formatDateTime(isoInstant: string): string {
  return dateTimeFormatter.format(new Date(isoInstant))
}

export function formatDayKey(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value)
}

export function formatPercent(value: number): string {
  return `${numberFormatter.format(value)} %`
}

/** Short "hace cuánto" for the live feed. */
export function formatRelative(isoInstant: string, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - new Date(isoInstant).getTime()) / 1000)

  if (seconds < 10) return 'ahora'
  if (seconds < 60) return `hace ${seconds} s`
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return `hace ${Math.floor(seconds / 86400)} d`
}

export function userName(usuario: string): string {
  return usuario
}
