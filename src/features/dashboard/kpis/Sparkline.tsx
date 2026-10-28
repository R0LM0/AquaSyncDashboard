import type { SparkPoint } from './sparklineSeries'

/** Tiny SVG sparkline: no chart library, no animation cost. */
export function Sparkline({
  points,
  color,
  width = 96,
  height = 28,
  label,
}: {
  points: SparkPoint[]
  color: string
  width?: number
  height?: number
  label: string
}) {
  if (points.length < 2) {
    return <span className="block h-7" aria-hidden="true" />
  }

  const values = points.map((point) => point.valor)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1

  const coordinates = points.map((point, index) => {
    const x = (index / (points.length - 1)) * width
    const y = height - ((point.valor - min) / span) * (height - 4) - 2
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <polyline
        points={coordinates.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / span) * (height - 4) - 2}
        r={2.6}
        fill={color}
      />
    </svg>
  )
}
