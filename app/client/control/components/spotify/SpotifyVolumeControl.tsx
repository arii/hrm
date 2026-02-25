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

  // Synchronize local volume state with the server's playback state.
  // We use a grace period after sending a command to prevent "snap-back"
  // (the slider jumping back to the old value before the server broadcasts the update).
  useEffect(() => {
    if (isSliding) return

    const timeSinceLastVolumeSend = Date.now() - lastVolumeSyncTimeRef.current

    const shouldRespectGracePeriod =
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend < VOLUME_SYNC_GRACE_PERIOD_MS

    if (shouldRespectGracePeriod) {
      return
    }

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
  }, [playbackVolume, isSliding])

  const handleVolumeChange = useCallback(
    (val: number) => {
      setIsSliding(true)
      setVolume(val)
      if (!isConnected) {
        const now = Date.now()
        // Throttle warning to avoid spam during active sliding
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
