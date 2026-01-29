// components/shared/VolumeSlider.tsx
'use client'
import React, { memo, useCallback } from 'react'
import { IconButton, Slider, Stack, Typography, Box } from '@mui/material'
import { VolumeUp, VolumeOff } from '@mui/icons-material'

interface VolumeSliderProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted?: (volume: number) => void
  onToggleMute: () => void
  showValue?: boolean
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onVolumeChangeCommitted,
  onToggleMute,
  showValue = false,
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
      spacing={1}
      alignItems="center"
      sx={{ minWidth: 150, flexGrow: 1 }}
      data-testid="volume-slider-container"
    >
      <IconButton
        size="small"
        onClick={onToggleMute}
        sx={{
          color: muted ? 'error.main' : 'grey.400',
          '&:hover': { color: 'white' },
        }}
        aria-label={muted ? 'Unmute' : 'Mute'}
        data-testid="volume-slider-mute-button"
      >
        {muted || volume === 0 ? (
          <VolumeOff fontSize="small" />
        ) : (
          <VolumeUp fontSize="small" />
        )}
      </IconButton>
      <Box
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
        component="span"
        id="volume-slider"
      >
        Volume
      </Box>
      <Slider
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        onChangeCommitted={handleVolumeChangeCommitted}
        min={0}
        max={100}
        size="small"
        aria-labelledby="volume-slider"
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

export default memo(VolumeSlider)
