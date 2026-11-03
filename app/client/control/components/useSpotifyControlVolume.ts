import { useCallback, useEffect, useRef, useState } from 'react'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import type { ExecuteSpotify } from '@/hooks/useSpotifyCommand'
import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'
import type { SpotifyDevice } from '@/types/core'

interface UseSpotifyControlVolumeParams {
  devices: SpotifyDevice[]
  playbackVolume: number | undefined
  connectionStatus: string
  showWarning: (message: string) => void
  resolveTargetDeviceId: () => string | undefined
  executeSpotify: ExecuteSpotify
}

/**
 * Volume state machine for the control page (#9298). Server is the source
 * of truth; the grace period keeps local slider drags from jumping when
 * broadcasts arrive mid-gesture. Distinct from useSpotifyVolumeSync, which
 * serves the dashboard display.
 */
export const useSpotifyControlVolume = ({
  devices,
  playbackVolume,
  connectionStatus,
  showWarning,
  resolveTargetDeviceId,
  executeSpotify,
}: UseSpotifyControlVolumeParams) => {
  const { volume, setVolume, muted, toggleMuteAndPersist } =
    useVolumePreference()
  const [isSliding, setIsSliding] = useState(false)
  const lastSentVolumeRef = useRef<string | null>(null)
  const lastWarningTimeRef = useRef<number>(0)
  const lastVolumeSyncTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  // Sync Volume (if not dragging and not within grace period after send)
  // We rely on the server as the source of truth for volume, but use a grace period
  // to prevent local sliders from "jumping" while the user is actively adjusting them.
  useEffect(() => {
    const activeDevice = devices.find((d) => d.is_active)
    if (isSliding) return

    const timeSinceLastVolumeSend = Date.now() - lastVolumeSyncTimeRef.current

    // Only sync if we haven't sent a volume command recently.
    // The server broadcasts a SPOTIFY_UPDATE immediately after a SET_VOLUME command,
    // confirming the new state to all clients.
    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (shouldRespectGracePeriod) {
      return
    }

    // Clear pending flag after grace period
    if (
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend >= VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      hasPendingSendRef.current = false
    }

    if (activeDevice && typeof playbackVolume === 'number') {
      if (playbackVolume !== volume) {
        setVolume(playbackVolume)
      }
    }
  }, [devices, playbackVolume, volume, isSliding, setVolume])

  const handleVolumeChange = useCallback(
    (val: number) => {
      setIsSliding(true)
      setVolume(val)
      if (connectionStatus !== 'Connected') {
        const now = Date.now()
        // Throttle warning to once every 3 seconds to avoid spam during sliding
        if (now - lastWarningTimeRef.current > 3000) {
          showWarning('Changes not saved: Offline')
          lastWarningTimeRef.current = now
        }
      }
    },
    [connectionStatus, showWarning, setVolume]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (connectionStatus !== 'Connected') return
      const targetDeviceId = resolveTargetDeviceId()

      // Prevent sending volume command if no device is targeted
      if (!targetDeviceId) return

      const sanitized = clampVolume(value)
      const messageKey = `${targetDeviceId}:${sanitized}`
      if (lastSentVolumeRef.current === messageKey) return

      hasPendingSendRef.current = true
      lastVolumeSyncTimeRef.current = Date.now()

      executeSpotify('SET_VOLUME', {
        volume: sanitized,
        deviceId: targetDeviceId,
      })

      lastSentVolumeRef.current = messageKey
    },
    [connectionStatus, resolveTargetDeviceId, executeSpotify]
  )

  const handleVolumeChangeCommitted = useCallback(
    (val: number) => {
      setIsSliding(false)
      sendVolumeCommand(val)
    },
    [sendVolumeCommand]
  )

  useEffect(() => {
    if (connectionStatus !== 'Connected') {
      lastSentVolumeRef.current = null
    }
  }, [connectionStatus])

  return {
    volume,
    muted,
    toggleMute: toggleMuteAndPersist,
    handleVolumeChange,
    handleVolumeChangeCommitted,
  }
}
