import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES, Pager, paginate, usePager } from './pagination'

const rows = Array.from({ length: 60 }, (_, i) => i + 1)

describe('paginate', () => {
  it('slices the page and reports the range', () => {
    const page = paginate(rows, 2, 25)
    expect(page.rows[0]).toBe(26)
    expect(page.rows).toHaveLength(25)
    expect(page).toMatchObject({ page: 2, totalPages: 3, total: 60, from: 26, to: 50 })
  })

  it('clamps a page past the end and handles empty lists', () => {
    expect(paginate(rows, 99, 25).page).toBe(3)
    expect(paginate(rows, 0, 25).page).toBe(1)
    expect(paginate([], 1, 25)).toMatchObject({ rows: [], totalPages: 1, total: 0, from: 0, to: 0 })
  })

  it('defaults to 25 with 10/25/50 sizes', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25)
    expect(PAGE_SIZES).toEqual([10, 25, 50])
  })
})

describe('usePager', () => {
  it('goes back to page 1 when the reset key changes', () => {
    const { result, rerender } = renderHook(({ key }) => usePager(key), { initialProps: { key: 'a' } })
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    rerender({ key: 'b' })
    expect(result.current.page).toBe(1)
  })

  it('goes back to page 1 when the size changes', () => {
    const { result } = renderHook(() => usePager('a'))
    act(() => result.current.setPage(3))
    act(() => result.current.setPageSize(50))
    expect(result.current).toMatchObject({ page: 1, pageSize: 50 })
  })
})

describe('Pager', () => {
  function setup(page = 2) {
    const onPage = vi.fn()
    const onPageSize = vi.fn()
    render(<Pager label="Cuentas" page={page} pageSize={25} total={60} onPage={onPage} onPageSize={onPageSize} />)
    return { onPage, onPageSize }
  }

  it('shows page x of y and the range', () => {
    setup()
    expect(screen.getByText(/Página 2 de 3/)).toBeInTheDocument()
    expect(screen.getByText(/26–50 de 60/)).toBeInTheDocument()
  })

  it('navigates with first, previous, next and last', () => {
    const { onPage } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Primera página' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Página siguiente' }))
    fireEvent.click(screen.getByRole('button', { name: 'Última página' }))
    expect(onPage.mock.calls.map((c) => c[0])).toEqual([1, 1, 3, 3])
  })

  it('disables the edges', () => {
    setup(1)
    expect(screen.getByRole('button', { name: 'Primera página' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled()
  })

  it('changes the page size', () => {
    const { onPageSize } = setup()
    fireEvent.change(screen.getByRole('combobox', { name: 'Filas por página' }), { target: { value: '50' } })
    expect(onPageSize).toHaveBeenCalledWith(50)
  })

  it('renders nothing for an empty list', () => {
    const { container } = render(<Pager label="x" page={1} pageSize={25} total={0} onPage={vi.fn()} onPageSize={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
