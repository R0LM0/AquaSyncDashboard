import { ALCANCE_PAIS } from '@/domain/alcance'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from '@/App'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { MockDashboardApi } from '@/adapters/mock/MockDashboardApi'
import { saveSession } from '@/features/auth/session'

const SECTIONS = [
  { path: '/resumen', content: 'Actividad diaria' },
  { path: '/mapa', content: 'Mapa de predios trabajados' },
  { path: '/avance-por-ruta', content: 'Avance general' },
  { path: '/usuarios', content: 'Ranking de usuarios' },
  { path: '/detalle-y-reportes', content: 'Exportar' },
] as const

function renderAt(path: string) {
  saveSession({ token: 't', usuario: 'jmedina', nombre: 'José Medina', alcance: ALCANCE_PAIS })
  window.history.replaceState(null, '', path)
  const api = new MockDashboardApi({ today: new Date(2026, 9, 27) })

  return render(
    <DashboardApiProvider api={api}>
      <App />
    </DashboardApiProvider>,
  )
}

describe('sections', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it.each(SECTIONS)('renders the skeleton and then the content of $path', async ({ path, content }) => {
    renderAt(path)

    expect(screen.getByTestId('section-skeleton')).toBeInTheDocument()
    expect(await screen.findByText(content, {}, { timeout: 4000 })).toBeInTheDocument()
  })
})
