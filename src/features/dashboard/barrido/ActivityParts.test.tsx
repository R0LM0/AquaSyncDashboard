import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ActividadPorDia } from '@/domain/types'
import { stackByDay } from './activity'
import { DayChart, DayTooltip, daySummary } from './ActivityParts'

const porDia: ActividadPorDia[] = [
  { fecha: '2026-10-30', dispositivo: 'Dispositivo A', cantidad: 4 },
  { fecha: '2026-10-30', dispositivo: 'Dispositivo B', cantidad: 2 },
  { fecha: '2026-11-01', dispositivo: 'Dispositivo A', cantidad: 9 },
]

describe('DayChart', () => {
  it('describes the stacked series for assistive technology', () => {
    render(<DayChart porDia={porDia} order={['Dispositivo A', 'Dispositivo B']} emptyTitle="Sin datos" />)
    const label = screen.getByTestId('day-chart').getAttribute('aria-label') ?? ''
    expect(label).toContain('2 dispositivos')
    expect(label).toContain('15 en total')
    expect(label).toContain('01/11/2026 con 9')
  })

  it('shows the empty state without data', () => {
    render(<DayChart porDia={[]} order={[]} emptyTitle="Sin encuestas en el período" />)
    expect(screen.getByText('Sin encuestas en el período')).toBeInTheDocument()
    expect(screen.queryByTestId('day-chart')).not.toBeInTheDocument()
  })

  it('summarises one device in the singular', () => {
    const { rows, aliases } = stackByDay([porDia[2]])
    expect(daySummary(rows, aliases)).toContain('1 dispositivo,')
  })
})

describe('DayTooltip', () => {
  it('lists the devices of the day with its colour and the total', () => {
    render(
      <DayTooltip
        active
        label="2026-10-30"
        payload={[
          { name: 'Dispositivo A', value: 4, color: '#2563eb' },
          { name: 'Dispositivo B', value: 2, color: '#db2777' },
          { name: 'Dispositivo C', value: 0, color: '#0d9488' },
        ]}
      />,
    )
    expect(screen.getByText('30/10/2026')).toBeInTheDocument()
    expect(screen.getByText('Dispositivo A')).toBeInTheDocument()
    expect(screen.queryByText('Dispositivo C')).not.toBeInTheDocument()
    expect(screen.getByText('Total').nextSibling).toHaveTextContent('6')
  })

  it('renders nothing when inactive', () => {
    const { container } = render(<DayTooltip active={false} payload={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
