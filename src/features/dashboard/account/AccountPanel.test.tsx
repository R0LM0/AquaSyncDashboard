import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardApiProvider } from '@/app/DashboardApiProvider'
import { NotFoundError } from '@/domain/errors'
import type { AccountDetail } from '@/domain/types'
import type { DashboardApi } from '@/ports/DashboardApi'
import { AccountPanel } from './AccountPanel'

function detail(overrides: Partial<AccountDetail> = {}): AccountDetail {
  return {
    cuenta: '5012',
    cliente: 'MARIA GONZALEZ',
    direccion: 'Frente al parque',
    tipoServicio: '1',
    estado: 'A',
    estadoAdministrativo: 'A',
    medidor: 'M-0001',
    filial: '01',
    zona: '02',
    ruta: '003',
    numeroCatastral: '02.003.5012',
    ugestionId: '4',
    ugestionNombre: 'UG MANAGUA',
    sucursalId: '17',
    sucursalNombre: 'SUCURSAL MANAGUA SUR',
    lat: 12.1364,
    lng: -86.2514,
    fotos: [
      {
        adjuntoId: '9001',
        tipo: 2,
        tipoNombre: 'Fachada',
        fecha: '2026-10-20T10:15:00',
        descripcion: 'Fachada del predio',
        urlImagen: 'data:image/svg+xml;utf8,fachada',
      },
      {
        adjuntoId: '9002',
        tipo: 2,
        tipoNombre: 'Medidor',
        fecha: '2026-10-20T10:16:00',
        descripcion: 'Medidor del predio',
        urlImagen: 'data:image/svg+xml;utf8,medidor',
      },
    ],
    historial: [
      {
        id: '1',
        fecha: '2026-10-27T19:42:10',
        usuario: 'jperez',
        tipoCambio: 'UbicacionCorregida',
        origen: 'app',
      },
      {
        id: '2',
        fecha: '2026-10-26T19:42:10',
        usuario: 'mlopez',
        tipoCambio: 'FotoNueva',
        origen: 'online',
      },
    ],
    ...overrides,
  }
}

function renderPanel(api: DashboardApi, props: Partial<Parameters<typeof AccountPanel>[0]> = {}) {
  const onClose = vi.fn()
  render(
    <DashboardApiProvider api={api}>
      <AccountPanel cuenta="5012" open onClose={onClose} apiBase="http://api/" {...props} />
    </DashboardApiProvider>,
  )
  return { onClose }
}

describe('AccountPanel', () => {
  it('shows the skeleton while the account loads', () => {
    const api = { accountDetail: vi.fn().mockReturnValue(new Promise(() => {})) } as unknown as DashboardApi

    renderPanel(api)

    expect(screen.getByTestId('account-panel')).toBeInTheDocument()
    expect(screen.getByTestId('account-panel-skeleton')).toBeInTheDocument()
  })

  it('renders the account, the badges, the photos and the history', async () => {
    const api = { accountDetail: vi.fn().mockResolvedValue(detail()) } as unknown as DashboardApi

    renderPanel(api)

    expect(await screen.findByText('MARIA GONZALEZ')).toBeInTheDocument()
    expect(screen.getByText('02.003.5012')).toBeInTheDocument()
    expect(screen.getByTestId('badge-conexion')).toHaveTextContent('Con conexión')
    expect(screen.getByText('SUCURSAL MANAGUA SUR')).toBeInTheDocument()
    expect(screen.getByText(/12\.136400/)).toBeInTheDocument()

    const photos = await screen.findByTestId('account-photos')
    expect(photos.querySelectorAll('img')).toHaveLength(2)
    expect(photos.querySelector('img')?.getAttribute('src')).toBe('data:image/svg+xml;utf8,fachada')

    const history = screen.getByTestId('account-history')
    expect(history.querySelectorAll('li')).toHaveLength(2)
    expect(history).toHaveTextContent('jperez')
    expect(history).toHaveTextContent('Ubicación corregida')
  })

  it('opens a photo in the viewer', async () => {
    const api = { accountDetail: vi.fn().mockResolvedValue(detail()) } as unknown as DashboardApi

    renderPanel(api)
    const photos = await screen.findByTestId('account-photos')

    fireEvent.click(photos.querySelector('button') as HTMLButtonElement)

    expect(await screen.findByTestId('photo-viewer')).toBeInTheDocument()
  })

  it('says so when the account does not exist', async () => {
    const api = {
      accountDetail: vi.fn().mockRejectedValue(new NotFoundError()),
    } as unknown as DashboardApi

    renderPanel(api)

    expect(await screen.findByText('Cuenta no encontrada')).toBeInTheDocument()
  })

  it('shows an empty state when the account has no photos', async () => {
    const api = {
      accountDetail: vi.fn().mockResolvedValue(detail({ fotos: [], historial: [] })),
    } as unknown as DashboardApi

    renderPanel(api)

    expect(await screen.findByText('Sin fotos')).toBeInTheDocument()
    expect(screen.getByText('Sin cambios registrados para esta cuenta.')).toBeInTheDocument()
  })

  it('closes with Escape', async () => {
    const api = { accountDetail: vi.fn().mockResolvedValue(detail()) } as unknown as DashboardApi

    const { onClose } = renderPanel(api)
    await screen.findByText('MARIA GONZALEZ')

    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('closes with the X button', async () => {
    const api = { accountDetail: vi.fn().mockResolvedValue(detail()) } as unknown as DashboardApi

    const { onClose } = renderPanel(api)
    await screen.findByText('MARIA GONZALEZ')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar el panel' }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })
})
