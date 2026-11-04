import { useEffect, useRef, useState } from 'react'
import {
  AUTO_TRANSFER_COOLDOWN_KEY,
  AUTO_TRANSFER_COOLDOWN_MS,
} from '@/constants/spotify'
import type { SpotifyDevice } from '@/types/core'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'

interface SpotifyAutoTransferInput {
  isReady: boolean
  deviceId: string | null
  connectionStatus: string
  devices: SpotifyDevice[] | null | undefined
  stableActive: boolean
  isPlaying: boolean
  executeSpotify: ExecuteSpotify
}

/** Guard inputs for one auto-transfer decision. Pure values. */
export interface AutoTransferEligibility {
  isReady: boolean
  deviceId: string | null
  connectionStatus: string
  devices: SpotifyDevice[] | null | undefined
  cooldownActive: boolean
  stableActive: boolean
  isPlaying: boolean
}

/**
 * Pure auto-transfer guard policy: ready player, connected socket, cool
 * cooldown, known non-empty list, nothing active (raw or latched), and
 * nothing playing. Unit-tested.
 */
export const shouldAutoTransfer = (input: AutoTransferEligibility): boolean => {
  if (!input.isReady || !input.deviceId) return false
  if (input.connectionStatus !== 'Connected') return false
  if (input.cooldownActive) return false
  if (!input.devices || input.devices.length === 0) return false
  // Raw check covers mount (before the latch has run once); the latched
  // check covers poll-to-poll flaps.
  if (input.devices.some((device) => device.is_active)) return false
  if (input.stableActive || input.isPlaying) return false
  return true
}

/**
 * Auto-connect: once the browser player is ready and the server device
 * list is known, silently select it when nothing else is active. Never
 * steals playback (skips when any device is active or anything is
 * playing) and never transfers blind on an empty list (waits for the
 * poll). Cooldown is shared across tabs and reloads via localStorage:
 * the SDK mints a new device id on every mount, so a per-id guard alone
 * refires (and flickers the status) on every reload.
 *
 * Returns whether an auto-transfer is pending server confirmation; a
 * device activating (or a 15s timeout) ends the pending display.
 * Extracted verbatim from SpotifyDisplay; covered by its auto-connect
 * component tests.
 */
export const useSpotifyAutoTransfer = ({
  isReady,
  deviceId,
  connectionStatus,
  devices,
  stableActive,
  isPlaying,
  executeSpotify,
}: SpotifyAutoTransferInput): boolean => {
  const [autoPending, setAutoPending] = useState(false)
  const autoPendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const lastFire = Number(
      localStorage.getItem(AUTO_TRANSFER_COOLDOWN_KEY) ?? 0
    )
    const cooldownActive = Date.now() - lastFire < AUTO_TRANSFER_COOLDOWN_MS
    if (
      !shouldAutoTransfer({
        isReady,
        deviceId,
        connectionStatus,
        devices,
        cooldownActive,
        stableActive,
        isPlaying,
      })
    ) {
      return
    }
    // Narrowing for the transfer call: the policy above already guarantees
    // a non-null id, the type system just cannot see through it.
    if (!deviceId) return
    localStorage.setItem(AUTO_TRANSFER_COOLDOWN_KEY, String(Date.now()))
    // Sync display state with the fired command; the cooldown above makes
    // this fire once, so it converges after one render, it cannot cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAutoPending(true)
    executeSpotify('TRANSFER_PLAYBACK', { deviceId, play: false })
    if (autoPendingTimeout.current) clearTimeout(autoPendingTimeout.current)
    // If the server never confirms, fall back to the manual button.
    autoPendingTimeout.current = setTimeout(() => setAutoPending(false), 15000)
  }, [
    isReady,
    deviceId,
    connectionStatus,
    devices,
    stableActive,
    isPlaying,
    executeSpotify,
  ])

  // A device activating ends the auto-pending display.
  useEffect(() => {
    if (autoPending && devices?.some((d) => d.is_active)) {
      if (autoPendingTimeout.current) {
        clearTimeout(autoPendingTimeout.current)
        autoPendingTimeout.current = null
      }
      // One-shot transition keyed on external server state; convergent.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoPending(false)
    }
  }, [autoPending, devices])

  useEffect(
    () => () => {
      if (autoPendingTimeout.current) clearTimeout(autoPendingTimeout.current)
    },
    []
  )

  return autoPending
}
