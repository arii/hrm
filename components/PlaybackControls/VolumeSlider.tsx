// components/PlaybackControls/VolumeSlider.tsx
'use client'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeOff from '@mui/icons-material/VolumeOff'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { memo, useCallback } from 'react'

interface VolumeSliderProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
  onVolumeChangeCommitted?: (volume: number) => void
  showValue?: boolean
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
  onVolumeChangeCommitted,
  showValue = true,
}) => {
  const handleVolumeChange = useCallback(
    (_event: any, value: number | number[]) => {
      onVolumeChange(value as number)
    },
    [onVolumeChange]
  )

  const handleVolumeChangeCommitted = useCallback(
    (_event: any, value: number | number[]) => {
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
      sx={{ minWidth: 120 }}
    >
      <IconButton
        size="small"
        onClick={onToggleMute}
        sx={{
          color: muted ? 'error.main' : 'grey.400',
          '&:hover': { color: 'white' },
        }}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted || volume === 0 ? (
          <VolumeOff fontSize="small" />
        ) : (
          <VolumeUp fontSize="small" />
        )}
      </IconButton>
      <Slider
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        onChangeCommitted={handleVolumeChangeCommitted}
        min={0}
        max={100}
        size="small"
        sx={{
          color: '#1DB954',
          '& .MuiSlider-thumb': {
            backgroundColor: 'white',
            width: 12,
            height: 12,
          },
          '& .MuiSlider-track': { height: 3 },
          '& .MuiSlider-rail': { height: 3 },
        }}
        aria-labelledby="volume-slider"
      />
      {showValue && (
        <Typography
          variant="caption"
          sx={{ color: 'grey.400', minWidth: '3ch', textAlign: 'right' }}
        >
          {volume}
        </Typography>
      )}
    </Stack>
  )
}

export default memo(VolumeSlider)
