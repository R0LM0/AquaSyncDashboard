import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CadastralBackdrop } from './CadastralBackdrop'

function stubCanvasContext() {
  const noop = vi.fn()
  const context = new Proxy(
    {},
    {
      get: () => noop,
      set: () => true,
    },
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  )
  return noop
}

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  setVisibility('visible')
})

describe('CadastralBackdrop', () => {
  it('animates when motion is allowed', () => {
    stubCanvasContext()
    stubReducedMotion(false)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)

    render(<CadastralBackdrop />)

    expect(raf).toHaveBeenCalled()
  })

  it('draws one static frame and never animates under prefers-reduced-motion', () => {
    const draw = stubCanvasContext()
    stubReducedMotion(true)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)

    render(<CadastralBackdrop />)

    expect(raf).not.toHaveBeenCalled()
    expect(draw).toHaveBeenCalled()
  })

  it('pauses while the tab is hidden and resumes when it is visible again', () => {
    stubCanvasContext()
    stubReducedMotion(false)
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(7)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    render(<CadastralBackdrop />)
    act(() => setVisibility('hidden'))
    expect(cancel).toHaveBeenCalledWith(7)

    raf.mockClear()
    act(() => setVisibility('visible'))
    expect(raf).toHaveBeenCalledTimes(1)
  })

  it('stops animating on unmount and never intercepts clicks', () => {
    stubCanvasContext()
    stubReducedMotion(false)
    vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(3)
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const { getByTestId, unmount } = render(<CadastralBackdrop />)
    expect(getByTestId('cadastral-backdrop').className).toContain('pointer-events-none')
    expect(getByTestId('cadastral-backdrop').getAttribute('aria-hidden')).toBe('true')

    unmount()
    expect(cancel).toHaveBeenCalledWith(3)
  })
})
