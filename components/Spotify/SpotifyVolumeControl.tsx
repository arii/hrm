'use client'
import VolumeSlider from '@/components/shared/VolumeSlider'
import Box from '@mui/material/Box'

interface SpotifyVolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted: (volume: number) => void
  onToggleMute: () => void
  disabled?: boolean
}

const SpotifyVolumeControl = ({
  volume,
  isMuted,
  onVolumeChange,
  onVolumeChangeCommitted,
  onToggleMute,
  disabled = false,
}: SpotifyVolumeControlProps) => {
  return (
    <Box
      sx={{ minWidth: { xs: 150, md: 250 }, display: 'flex', alignItems: 'center' }}
      data-testid="spotify-volume-control"
    >
      <VolumeSlider
        volume={volume}
        muted={isMuted}
        onVolumeChange={onVolumeChange}
        onVolumeChangeCommitted={onVolumeChangeCommitted}
        onToggleMute={onToggleMute}
        showValue={true}
        disabled={disabled}
      />
    </Box>
  )
}

export default SpotifyVolumeControl
