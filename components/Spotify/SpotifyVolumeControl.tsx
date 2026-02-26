'use client'
import { useCallback, useRef } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import VolumeSlider from '@/components/shared/VolumeSlider'
import {
  SPOTIFY_OFFLINE_WARNING,
  VOLUME_SYNC_GRACE_PERIOD_MS,
} from '@/constants/spotify'

interface SpotifyVolumeControlProps {
  volume: number
  muted: boolean
  setVolume: (val: number) => void
  toggleMute: () => void
  setIsSliding: (val: boolean) => void
  onVolumeCommand: (val: number) => void
  disabled?: boolean
}

const SpotifyVolumeControl = ({
  volume,
  muted,
  setVolume,
  toggleMute,
  setIsSliding,
  onVolumeCommand,
  disabled,
}: SpotifyVolumeControlProps) => {
  const { connectionStatus } = useWebSocket()
  const { showWarning } = useAppSnackbar()
  const lastWarningTimeRef = useRef<number>(0)

  const handleVolumeChange = useCallback(
    (val: number) => {
      setIsSliding(true)
      setVolume(val)
      if (connectionStatus !== 'Connected') {
        const now = Date.now()
        if (now - lastWarningTimeRef.current > VOLUME_SYNC_GRACE_PERIOD_MS) {
          showWarning(SPOTIFY_OFFLINE_WARNING)
          lastWarningTimeRef.current = now
        }
      }
    },
    [connectionStatus, showWarning, setVolume, setIsSliding]
  )

  const handleVolumeChangeCommitted = useCallback(
    (val: number) => {
      setIsSliding(false)
      onVolumeCommand(val)
    },
    [setIsSliding, onVolumeCommand]
  )

  return (
    <VolumeSlider
      volume={volume}
      muted={muted}
      onVolumeChange={handleVolumeChange}
      onVolumeChangeCommitted={handleVolumeChangeCommitted}
      onToggleMute={toggleMute}
      showValue
      disabled={disabled}
    />
  )
}

export default SpotifyVolumeControl
