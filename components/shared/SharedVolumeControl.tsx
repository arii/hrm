// components/shared/SharedVolumeControl.tsx
'use client'
import VolumeSlider from '../PlaybackControls/VolumeSlider'

interface SharedVolumeControlProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
}

const SharedVolumeControl: React.FC<SharedVolumeControlProps> = ({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}) => {
  return (
    <VolumeSlider
      volume={volume}
      muted={muted}
      onVolumeChange={onVolumeChange}
      onToggleMute={onToggleMute}
    />
  )
}

export default SharedVolumeControl
