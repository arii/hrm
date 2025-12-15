// components/Spotify/VolumeSlider.tsx
import React from 'react'
import { IconButton, Slider, Stack, Typography } from '@mui/material'
import { VolumeUp, VolumeOff } from '@mui/icons-material'

interface VolumeSliderProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  showValue?: boolean
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  showValue = true,
}) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flexGrow: 1, minWidth: 150 }}
    >
      <IconButton
        onClick={onToggleMute}
        size="small"
        aria-label={muted ? 'Unmute volume' : 'Mute volume'}
      >
        {muted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
      </IconButton>
      <Slider
        value={muted ? 0 : volume}
        onChange={(_, val) => onVolumeChange(val as number)}
        min={0}
        max={100}
        size="small"
        aria-label="Volume control"
      />
      {showValue && (
        <Typography
          variant="caption"
          sx={{ minWidth: '3ch', textAlign: 'right' }}
        >
          {muted ? '0' : volume}
        </Typography>
      )}
    </Stack>
  )
}

export default VolumeSlider
