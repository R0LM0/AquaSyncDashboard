import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { ALCANCE_PAIS } from '@/domain/alcance'
import { ForbiddenError, NotFoundError } from '@/domain/errors'
import type { BarridoEncuestaDetalle } from '@/domain/types'
import { buildPopup } from './activityPopup'
import { SurveyPanel } from './SurveyPanel'

const DETAIL: BarridoEncuestaDetalle = {
  id: '203405',
  fecha: '2026-11-01T21:52:41',
  cuenta: '199395',
  catastro: '5-75-9',
  cliente: 'ANA PEREZ',
  direccion: 'Barrio 5, casa 2',
  estadoAdm: 'Alta',
  rubro: 'CASA DOMICILIAR',
  tarifa: 'Domiciliar',
  jardin: true,
  piscina: false,
  tanque: true,
  tanqueM: 2,
  plantaPiso: false,
  observacion: 'Medidor visible',
  lat: 12.1,
  lng: -86.2,
  tieneFoto: true,
}

function setup(overrides: Partial<MockDashboardApi> = {}, onClose = vi.fn()) {
  const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
  Object.assign(api, overrides)
  render(
    <DashboardApiProvider api={api}>
      <SurveyPanel surveyId="203405" open onClose={onClose} />
    </DashboardApiProvider>,
  )
  return { api, onClose }
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:foto')
  URL.revokeObjectURL = vi.fn()
  void ALCANCE_PAIS
})
afterEach(() => vi.restoreAllMocks())

describe('SurveyPanel', () => {
  it('shows the detail fields and the photo', async () => {
    setup({
      barridoEncuesta: async () => DETAIL,
      barridoEncuestaFoto: async () => new Blob(['x'], { type: 'image/jpeg' }),
    })

    expect(await screen.findByText('ANA PEREZ')).toBeInTheDocument()
    expect(screen.getByText('Alta')).toBeInTheDocument()
    expect(screen.getByText('CASA DOMICILIAR')).toBeInTheDocument()
    expect(screen.getByText('Sí (2 m³)')).toBeInTheDocument()
    expect(screen.getByText('Medidor visible')).toBeInTheDocument()
    const photo = await screen.findByTestId('survey-photo')
    expect(photo).toHaveAttribute('src', 'blob:foto')
  })

  it('shows "Sin foto" when the survey has none', async () => {
    const photo = vi.fn()
    setup({ barridoEncuesta: async () => ({ ...DETAIL, tieneFoto: false }), barridoEncuestaFoto: photo })

    expect(await screen.findByText('Sin foto')).toBeInTheDocument()
    expect(photo).not.toHaveBeenCalled()
  })

  it('shows "Sin foto" when the photo answers 404', async () => {
    setup({
      barridoEncuesta: async () => DETAIL,
      barridoEncuestaFoto: async () => {
        throw new NotFoundError('no')
      },
    })

    expect(await screen.findByText('Sin foto')).toBeInTheDocument()
  })

  it('shows an error when the photo fails', async () => {
    setup({
      barridoEncuesta: async () => DETAIL,
      barridoEncuestaFoto: async () => {
        throw new Error('boom')
      },
    })

    expect(await screen.findByText('No se pudo cargar la foto')).toBeInTheDocument()
  })

  it('explains a survey outside the scope', async () => {
    setup({
      barridoEncuesta: async () => {
        throw new ForbiddenError('fuera')
      },
    })

    expect(await screen.findByText('Sin acceso')).toBeInTheDocument()
  })

  it('shows a loading skeleton first, closes with Escape and revokes the object URL', async () => {
    const { onClose } = setup({
      barridoEncuesta: async () => DETAIL,
      barridoEncuestaFoto: async () => new Blob(['x']),
    })

    expect(screen.getByTestId('survey-panel-skeleton')).toBeInTheDocument()
    await screen.findByTestId('survey-photo')

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('revokes the object URL when it unmounts', async () => {
    const api = new MockDashboardApi({ today: new Date(2026, 10, 1, 12) })
    api.barridoEncuesta = async () => DETAIL
    api.barridoEncuestaFoto = async () => new Blob(['x'])
    const view = render(
      <DashboardApiProvider api={api}>
        <SurveyPanel surveyId="203405" open onClose={() => undefined} />
      </DashboardApiProvider>,
    )
    await screen.findByTestId('survey-photo')

    view.unmount()

    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:foto'))
  })
})

describe('survey popup', () => {
  it('offers "Ver encuesta" only for surveys', () => {
    expect(buildPopup('Cuenta 1', [], 12.1, -86.2, { survey: true })).toContain('data-action="survey"')
    expect(buildPopup('Cuenta 1', [], 12.1, -86.2)).not.toContain('data-action="survey"')
  })
})
