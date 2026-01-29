// components/Spotify/VolumeSlider.tsx
import React from 'react'
import { IconButton, Slider, Stack, Typography } from '@mui/material'
import { VolumeUp, VolumeOff } from '@mui/icons-material'

interface VolumeSliderProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted?: (volume: number) => void // Add this line
  onToggleMute: () => void
  showValue?: boolean
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onVolumeChangeCommitted,
  onToggleMute,
  showValue = true,
}) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flexGrow: 1, minWidth: 150 }}
      data-testid="volume-slider-container"
    >
      <IconButton
        onClick={onToggleMute}
        aria-label={muted ? 'Unmute volume' : 'Mute volume'}
        data-testid="volume-slider-mute-button"
      >
        {muted || volume === 0 ? <VolumeOff /> : <VolumeUp />}
      </IconButton>
      <Slider
        value={muted ? 0 : volume}
        onChange={(_, val) => onVolumeChange(val as number)}
        onChangeCommitted={(_, val) => onVolumeChangeCommitted?.(val as number)}
        min={0}
        max={100}
        size="small"
        aria-label="Volume control"
        data-testid="volume-slider-input"
      />
      {showValue && (
        <Typography
          variant="caption"
          sx={{ minWidth: '3ch', textAlign: 'right' }}
          data-testid="volume-slider-value"
        >
          {muted ? '0' : volume}
        </Typography>
      )}
    </Stack>
  )
}

export default VolumeSlider
