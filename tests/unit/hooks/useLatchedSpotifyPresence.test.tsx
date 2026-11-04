/** @jest-environment jsdom */

import { useEffect } from 'react'
import { render } from '@testing-library/react'
import { useLatchedSpotifyPresence } from '@/hooks/useLatchedSpotifyPresence'
import type { SpotifyDevice } from '@/types/core'

describe('useLatchedSpotifyPresence render stability', () => {
  const idleHrmPlayer = {
    id: 'browser-player',
    name: 'HRM Web Player',
    is_active: false,
  } as SpotifyDevice

  it('does not re-render when a poll carries same-value devices under a new identity', () => {
    const counter = { renders: 0 }
    const Probe = ({ devices }: { devices: SpotifyDevice[] }) => {
      useLatchedSpotifyPresence(devices)
      // No dep array: fires after every render, so this counts renders.
      useEffect(() => {
        counter.renders += 1
      })
      return null
    }
    const { rerender } = render(<Probe devices={[idleHrmPlayer]} />)
    const afterMount = counter.renders
    // Fresh array identity, same content: exactly what the device poll
    // broadcasts on every tick (filter+map always allocate).
    rerender(<Probe devices={[{ ...idleHrmPlayer }]} />)
    expect(counter.renders).toBe(afterMount + 1)
  })

  it('still re-renders when the latched values actually change', () => {
    const seen: boolean[] = []
    const Probe = ({ devices }: { devices: SpotifyDevice[] }) => {
      const stable = useLatchedSpotifyPresence(devices)
      seen.push(stable.listed)
      return null
    }
    const { rerender } = render(<Probe devices={[]} />)
    expect(seen[seen.length - 1]).toBe(false)
    rerender(<Probe devices={[idleHrmPlayer]} />)
    expect(seen[seen.length - 1]).toBe(true)
  })
})
