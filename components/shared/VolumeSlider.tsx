// components/shared/VolumeSlider.tsx
'use client'
import { memo, useCallback } from 'react'
import { IconButton, Slider, Stack, Typography } from '@mui/material'
import { VolumeUp, VolumeDown, VolumeOff } from '@mui/icons-material'

interface VolumeSliderProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted?: (volume: number) => void
  onToggleMute: () => void
  showValue?: boolean
  sliderColor?: string
  size?: 'small' | 'medium'
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onVolumeChangeCommitted,
  onToggleMute,
  showValue = false,
  sliderColor = '#1DB954', // Default to Spotify green
  size = 'small',
}) => {
  const handleVolumeChange = useCallback(
    (_event: any, value: number | number[]) => {
      onVolumeChange(value as number)
    },
    [onVolumeChange]
  )

  const handleVolumeChangeCommitted = useCallback(
    (_event: any, value: number | number[]) => {
      onVolumeChangeCommitted?.(value as number)
    },
    [onVolumeChangeCommitted]
  )

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ flexGrow: 1, minWidth: 150 }}
      data-testid="volume-slider-container"
    >
      <IconButton
        size={size}
        onClick={onToggleMute}
        sx={{
          color: muted ? 'error.main' : 'grey.400',
          '&:hover': { color: 'white' },
        }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        data-testid="volume-slider-mute-button"
      >
        {muted || volume === 0 ? (
          <VolumeOff fontSize={size} />
        ) : (
          <VolumeDown fontSize={size} />
        )}
      </IconButton>
      <Slider
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        onChangeCommitted={handleVolumeChangeCommitted}
        min={0}
        max={100}
        size={size}
        sx={{
          color: sliderColor,
          '& .MuiSlider-thumb': {
            backgroundColor: 'white',
            width: size === 'small' ? 12 : 16,
            height: size === 'small' ? 12 : 16,
          },
          '& .MuiSlider-track': { height: 3 },
          '& .MuiSlider-rail': { height: 3 },
        }}
        aria-label="Volume control"
        data-testid="volume-slider-input"
      />
      <VolumeUp sx={{ color: 'grey.400' }} fontSize={size} />
      {showValue && (
        <Typography
          variant="caption"
          sx={{ minWidth: '3ch', textAlign: 'right', color: 'common.white' }}
          data-testid="volume-slider-value"
        >
          {muted ? '0' : volume}
        </Typography>
      )}
    </Stack>
  )
}

export default memo(VolumeSlider)
