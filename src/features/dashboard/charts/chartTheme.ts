import { CHANGE_TYPE_COLORS } from '@/domain/labels'

/** Shared chart chrome so every chart in the dashboard looks the same. */
export const AXIS_PROPS = {
  stroke: 'currentColor',
  tick: { fill: 'currentColor', fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const

export const GRID_PROPS = {
  stroke: 'hsl(var(--chart-grid))',
  strokeDasharray: '3 3',
  vertical: false,
} as const

export const TOOLTIP_PROPS = {
  contentStyle: {
    background: 'hsl(var(--surface))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '0.75rem',
    boxShadow: 'var(--shadow-panel)',
    fontSize: 12,
    color: 'hsl(var(--fg))',
  },
  labelStyle: { color: 'hsl(var(--muted-fg))', fontWeight: 700, fontSize: 11 },
  itemStyle: { color: 'hsl(var(--fg))' },
  cursor: { fill: 'hsl(var(--surface-2) / 0.7)' },
} as const

export const TYPE_COLORS = CHANGE_TYPE_COLORS

/** Recharts animation is on unless the user asked for less motion. */
export const chartAnimation = (reducedMotion: boolean) => ({
  isAnimationActive: !reducedMotion,
  animationDuration: 800,
})
