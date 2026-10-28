import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS } from '../../../domain/labels'

/** Kept out of the lazy map module: the legend renders before the tiles load. */
export function MapLegend() {
  return (
    <ul className="legend">
      {Object.entries(CHANGE_TYPE_LABELS).map(([tipo, label]) => (
        <li key={tipo}>
          <span
            className="legend__swatch"
            style={{ background: CHANGE_TYPE_COLORS[tipo as keyof typeof CHANGE_TYPE_COLORS] }}
            aria-hidden="true"
          />
          {label}
        </li>
      ))}
    </ul>
  )
}
