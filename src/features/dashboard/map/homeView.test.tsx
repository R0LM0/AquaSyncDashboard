import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChangesMap } from './ChangesMap'

describe('map home view', () => {
  it('starts on the view of the user scope (Alcance.Mapa)', async () => {
    // The map reports its settled view on mount: that is the zoom the user sees.
    const onViewChange = vi.fn()

    render(
      <ChangesMap
        points={[]}
        height={320}
        home={{ lat: 13.48, lng: -86.47, zoom: 11 }}
        onViewChange={onViewChange}
      />,
    )

    await waitFor(() => expect(onViewChange).toHaveBeenCalled())
    expect(onViewChange.mock.calls[0][0].zoom).toBe(11)
  })
})
