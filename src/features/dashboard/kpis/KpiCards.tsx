import type { Summary } from '../../../domain/types'
import { formatNumber, formatPercent } from '../../../shared/format'

const cards: Array<{ key: keyof Summary; label: string; hint: string; percent?: boolean }> = [
  { key: 'cuentasTrabajadas', label: 'Cuentas trabajadas', hint: 'Predios atendidos en el período' },
  { key: 'fotosNuevas', label: 'Fotos nuevas', hint: 'Primera evidencia fotográfica' },
  { key: 'fotosActualizadas', label: 'Fotos actualizadas', hint: 'Reemplazo de una foto existente' },
  { key: 'ubicaciones', label: 'Ubicaciones', hint: 'Nuevas y corregidas' },
  { key: 'usuariosActivos', label: 'Usuarios activos', hint: 'Personal de campo con actividad' },
  { key: 'avanceRutaPct', label: 'Avance de ruta', hint: 'Cuentas trabajadas sobre el total', percent: true },
]

function cardValue(summary: Summary, key: keyof Summary, percent?: boolean): string {
  const value = summary[key]
  // The API reports `null` when it cannot compute the route percentage.
  if (value === null) return '—'
  return percent ? formatPercent(value) : formatNumber(value)
}

export function KpiCards({ summary }: { summary: Summary }) {
  return (
    <div className="kpis" role="list">
      {cards.map((card) => (
        <article className="kpi" role="listitem" key={card.key}>
          <p className="kpi__label">{card.label}</p>
          <p className="kpi__value" data-testid={`kpi-${card.key}`}>
            {cardValue(summary, card.key, card.percent)}
          </p>
          <p className="kpi__hint">{card.hint}</p>
        </article>
      ))}
    </div>
  )
}
