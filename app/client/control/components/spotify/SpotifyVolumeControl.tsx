// File: app/client/control/components/spotify/SpotifyVolumeControl.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import VolumeSlider from '@/components/shared/VolumeSlider'
import useVolumePreference, { clampVolume } from '@/hooks/useVolumePreference'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'

interface SpotifyVolumeControlProps {
  playbackVolume?: number
  targetDeviceId?: string
  isConnected: boolean
}

const SpotifyVolumeControl = ({
  playbackVolume,
  targetDeviceId,
  isConnected,
}: SpotifyVolumeControlProps) => {
  const { volume, setVolume, muted, toggleMute } = useVolumePreference()
  const { showWarning } = useAppSnackbar()
  const { execute: executeSpotify } = useSpotifyCommand()

  const [isSliding, setIsSliding] = useState(false)
  const lastSentVolumeRef = useRef<string | null>(null)
  const lastWarningTimeRef = useRef<number>(0)
  const lastVolumeSyncTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  // Sync Volume (if not dragging and not within grace period after send)
  // We rely on the server as the source of truth for volume, but use a grace period
  // to prevent local sliders from "jumping" while the user is actively adjusting them.
  useEffect(() => {
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

    if (typeof playbackVolume === 'number') {
      if (playbackVolume !== volume) {
        setVolume(playbackVolume)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackVolume, isSliding]) // Rely on playbackVolume update to trigger sync

  const handleVolumeChange = useCallback(
    (val: number) => {
      setIsSliding(true)
      setVolume(val)
      if (!isConnected) {
        const now = Date.now()
        // Throttle warning to once every 3 seconds to avoid spam during sliding
        if (now - lastWarningTimeRef.current > 3000) {
          showWarning('Changes not saved: Offline')
          lastWarningTimeRef.current = now
        }
      }
    },
    [isConnected, showWarning, setVolume]
  )

  const sendVolumeCommand = useCallback(
    (value: number) => {
      if (!isConnected || !targetDeviceId) return

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
    [isConnected, targetDeviceId, executeSpotify]
  )

  const handleVolumeChangeCommitted = useCallback(
    (val: number) => {
      setIsSliding(false)
      sendVolumeCommand(val)
    },
    [sendVolumeCommand]
  )

  useEffect(() => {
    if (!isConnected) {
      lastSentVolumeRef.current = null
    }
  }, [isConnected])

  return (
    <VolumeSlider
      volume={volume}
      muted={muted}
      onVolumeChange={handleVolumeChange}
      onVolumeChangeCommitted={handleVolumeChangeCommitted}
      onToggleMute={toggleMute}
      showValue={true}
    />
  )
}

export default SpotifyVolumeControl
