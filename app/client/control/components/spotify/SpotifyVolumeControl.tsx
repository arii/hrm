import { useCallback, useEffect, useRef, useState } from 'react'
import VolumeSlider from '@/components/shared/VolumeSlider'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { VOLUME_SYNC_GRACE_PERIOD_MS } from '@/constants/spotify'

interface SpotifyVolumeControlProps {
  playbackVolume?: number
  isConnected: boolean
  onVolumeChangeCommitted: (volume: number) => void
}

const SpotifyVolumeControl = ({
  playbackVolume,
  isConnected,
  onVolumeChangeCommitted,
}: SpotifyVolumeControlProps) => {
  const { volume, setVolume, muted, toggleMute } = useVolumePreference()
  const { showWarning } = useAppSnackbar()

  const [isSliding, setIsSliding] = useState(false)
  const lastWarningTimeRef = useRef<number>(0)
  const lastVolumeSyncTimeRef = useRef<number>(0)
  const hasPendingSendRef = useRef<boolean>(false)

  useEffect(() => {
    if (isSliding) return

    const timeSinceLastVolumeSend = Date.now() - lastVolumeSyncTimeRef.current

    // Only sync if outside the grace period of a manual update
    if (
      hasPendingSendRef.current &&
      timeSinceLastVolumeSend < VOLUME_SYNC_GRACE_PERIOD_MS
    ) {
      return
    }

    if (typeof playbackVolume === 'number' && playbackVolume !== volume) {
      setVolume(playbackVolume)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackVolume, isSliding])

  const handleVolumeChange = useCallback(
    (val: number) => {
      setIsSliding(true)
      setVolume(val)
      if (!isConnected) {
        const now = Date.now()
        if (now - lastWarningTimeRef.current > 3000) {
          showWarning('Changes not saved: Offline')
          lastWarningTimeRef.current = now
        }
      }
    },
    [isConnected, showWarning, setVolume]
  )

  const handleVolumeChangeCommitted = useCallback(
    (val: number) => {
      setIsSliding(false)
      if (!isConnected) return

      hasPendingSendRef.current = true
      lastVolumeSyncTimeRef.current = Date.now()
      onVolumeChangeCommitted(val)
    },
    [isConnected, onVolumeChangeCommitted]
  )

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
