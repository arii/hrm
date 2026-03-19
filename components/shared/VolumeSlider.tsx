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
import { styled } from '@mui/material/styles'
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

const StyledSlider = styled(Slider, {
  shouldForwardProp: (prop) => prop !== 'sliderColor' && prop !== 'scaleFactor',
})<{ sliderColor?: string; scaleFactor: number }>(
  ({ theme, sliderColor, scaleFactor }) => ({
    color: sliderColor || theme.palette.primary.main,
    height: 8 * scaleFactor,
    '& .MuiSlider-thumb': {
      backgroundColor: 'white',
      width: 28 * scaleFactor,
      height: 28 * scaleFactor,
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      '&:hover, &.Mui-focusVisible': {
        boxShadow: sliderColor
          ? `0 0 0 8px ${alpha(sliderColor, 0.16)}`
          : `0 0 0 8px ${alpha(theme.palette.primary.main, 0.16)}`,
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        width: 44,
        height: 44,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
    },
    '& .MuiSlider-track, .MuiSlider-rail': { height: 8 * scaleFactor },
    '& .MuiSlider-rail': { opacity: 0.3 },
  })
)

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

  const SCALE_FACTOR = size === 'small' ? 0.75 : 1

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
          padding: `${12 * SCALE_FACTOR}px`,
        }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        data-testid="volume-slider-mute-button"
      >
        {muted || volume === 0 ? (
          <VolumeOff fontSize={size === 'small' ? 'small' : 'medium'} />
        ) : (
          <VolumeDown fontSize={size === 'small' ? 'small' : 'medium'} />
        )}
      </IconButton>

      <StyledSlider
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        onChangeCommitted={handleVolumeChangeCommitted}
        scaleFactor={SCALE_FACTOR}
        disabled={disabled}
        sliderColor={sliderColor}
        aria-label="Volume control"
        getAriaValueText={(value) => `${value}%`}
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
