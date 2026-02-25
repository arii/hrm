// components/shared/VolumeSlider.tsx
'use client'
import React, { memo, useCallback } from 'react'
import {
  IconButton,
  Slider,
  Stack,
  Typography,
  SxProps,
  Theme,
  alpha,
} from '@mui/material'
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
  disabled?: boolean
  sx?: SxProps<Theme>
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onVolumeChangeCommitted,
  onToggleMute,
  showValue = false,
  sliderColor,
  size = 'small',
  disabled = false,
  sx,
}) => {
  const handleVolumeChange = useCallback(
    (_: Event | React.SyntheticEvent, value: number | number[]) => {
      onVolumeChange(value as number)
    },
    [onVolumeChange]
  )

  const handleVolumeChangeCommitted = useCallback(
    (_: Event | React.SyntheticEvent, value: number | number[]) => {
      if (onVolumeChangeCommitted) {
        onVolumeChangeCommitted(value as number)
      }
    },
    [onVolumeChangeCommitted]
  )

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{
        flexGrow: 1,
        width: '100%',
        minWidth: { xs: 150, md: 250 },
        px: 1,
        ...sx,
      }}
      data-testid="volume-slider-container"
    >
      <IconButton
        size={size}
        onClick={onToggleMute}
        disabled={disabled}
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
        size={size}
        disabled={disabled}
        sx={(theme) => ({
          color: sliderColor || theme.palette.primary.main,
          height: 6,
          '& .MuiSlider-thumb': {
            backgroundColor: 'white',
            width: size === 'small' ? 18 : 22,
            height: size === 'small' ? 18 : 22,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: sliderColor
                ? `0 0 0 8px ${alpha(sliderColor, 0.16)}`
                : `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
            },
          },
          '& .MuiSlider-track, .MuiSlider-rail': { height: 6 },
          '& .MuiSlider-rail': { opacity: 0.3 },
        })}
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
