import { useEffect, useRef, useState } from 'react'
import { HRM_WEB_PLAYER_NAME, STABLE_ACTIVE_POLLS } from '@/constants/spotify'
import type { SpotifyDevice } from '@/types/core'

interface LatchedSpotifyPresence {
  active: boolean
  hrmActive: boolean
  listed: boolean
}

/**
 * Latched server truth over the flapping Spotify device list: flips true
 * on first sighting, requires STABLE_ACTIVE_POLLS consecutive negative
 * polls to flip false. Convergent: derived from poll arrivals, settles
 * between polls. Extracted verbatim from SpotifyDisplay; covered by its
 * component tests (badge flap cases).
 */
export const useLatchedSpotifyPresence = (
  devices: SpotifyDevice[] | null | undefined
): LatchedSpotifyPresence => {
  const [stable, setStable] = useState({
    active: false,
    hrmActive: false,
    listed: false,
  })
  const negActive = useRef(0)
  const negListed = useRef(0)
  const lastActiveName = useRef<string | null>(null)
  useEffect(() => {
    if (!devices) return
    const active = devices.find((device) => device.is_active) ?? null
    const listed = devices.some((device) => device.name === HRM_WEB_PLAYER_NAME)
    negActive.current = active ? 0 : negActive.current + 1
    negListed.current = listed ? 0 : negListed.current + 1
    if (active) lastActiveName.current = active.name
    const negA = negActive.current
    const negL = negListed.current
    const lastName = lastActiveName.current
    // Convergent: derived from poll arrivals, settles between polls.
    // The device poll reallocates the list every tick, so same-value
    // polls must keep the previous identity or every tick re-renders.
    setStable((prev) => {
      const nextActive = !!active || (prev.active && negA < STABLE_ACTIVE_POLLS)
      const nextHrmActive = nextActive && lastName === HRM_WEB_PLAYER_NAME
      const nextListed = listed || (prev.listed && negL < STABLE_ACTIVE_POLLS)
      if (
        prev.active === nextActive &&
        prev.hrmActive === nextHrmActive &&
        prev.listed === nextListed
      ) {
        return prev
      }
      return {
        active: nextActive,
        hrmActive: nextHrmActive,
        listed: nextListed,
      }
    })
  }, [devices])
  return stable
}
