import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CHANGE_TYPE_COLORS, CHANGE_TYPE_LABELS, CHANGE_TYPES } from '@/domain/labels'
import type { DailyProgress } from '@/domain/types'
import { MapLegend } from './map/MapLegend'
import { ChangeTypeDonut } from './charts/ChangeTypeDonut'
import { changeTypeSlices } from './charts/changeTypeSlices'

const daily: DailyProgress[] = CHANGE_TYPES.map((tipo) => ({
  fecha: '2026-10-27',
  usuario: 'jmedina',
  tipoCambio: tipo,
  cambios: 3,
}))

/** jsdom normalizes inline colours, so compare normalized values. */
function normalize(color: string): string {
  const probe = document.createElement('div')
  probe.style.background = color
  return probe.style.background
}

describe('change type colours', () => {
  it('uses one source of truth in the legend and the charts', () => {
    render(
      <div>
        <MapLegend />
        <ChangeTypeDonut daily={daily} />
      </div>,
    )

    for (const tipo of CHANGE_TYPES) {
      const swatch = screen.getByTestId(`legend-${tipo}`)
      expect(swatch.style.background).toBe(normalize(CHANGE_TYPE_COLORS[tipo]))
    }

    // The donut takes its slices (and their colours) from the same constant.
    expect(changeTypeSlices(daily).map((slice) => slice.color)).toEqual(
      CHANGE_TYPES.map((tipo) => CHANGE_TYPE_COLORS[tipo]),
    )
  })

  it('labels every change type', () => {
    for (const tipo of CHANGE_TYPES) {
      expect(CHANGE_TYPE_LABELS[tipo]).toMatch(/^[A-ZÁÉÍÓÚ]/)
    }
  })
})
