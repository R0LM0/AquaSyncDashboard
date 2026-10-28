import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EnvironmentChip } from './EnvironmentChip'

const CASES = [
  { mode: 'production', apiUrl: 'http://192.168.1.15:8070/', label: 'PRODUCCIÓN', tone: 'success' },
  { mode: 'test', apiUrl: 'http://192.168.1.15:7050/', label: 'PRUEBAS', tone: 'warning' },
  { mode: 'localapi', apiUrl: 'http://localhost:5029/', label: 'LOCAL', tone: 'info' },
  { mode: 'development', apiUrl: 'http://localhost:7050/', label: 'DATOS DE PRUEBA', tone: 'violet' },
] as const

describe('EnvironmentChip', () => {
  it.each(CASES)('labels $mode as $label with the $tone tone', ({ mode, apiUrl, label, tone }) => {
    render(<EnvironmentChip env={{ MODE: mode, VITE_API_MODE: 'http' }} apiUrl={apiUrl} />)

    const chip = screen.getByTestId('environment-chip')
    expect(chip).toHaveTextContent(label)
    expect(chip).toHaveAttribute('data-tone', tone)
  })

  it('marks simulated data even when the build mode says test', () => {
    render(
      <EnvironmentChip env={{ MODE: 'test', VITE_API_MODE: 'mock' }} apiUrl="http://localhost:7050/" />,
    )

    expect(screen.getByTestId('environment-chip')).toHaveAttribute('data-tone', 'violet')
    expect(screen.getByTestId('environment-chip')).toHaveTextContent('DATOS DE PRUEBA')
  })
})
