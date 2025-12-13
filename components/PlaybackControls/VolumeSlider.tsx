// components/PlaybackControls/VolumeSlider.tsx
'use client'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeOff from '@mui/icons-material/VolumeOff'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import { memo, useCallback } from 'react'

interface VolumeSliderProps {
  volume: number
  muted: boolean
  onVolumeChange: (volume: number) => void
  onToggleMute: () => void
}

const VolumeSlider: React.FC<VolumeSliderProps> = ({
  volume,
  muted,
  onVolumeChange,
  onToggleMute,
}) => {
  const handleVolumeChange = useCallback(
    (_: Event, value: number | number[]) => {
      onVolumeChange(value as number)
    },
    [onVolumeChange]
  )

  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      sx={{ width: 120 }}
      data-testid="volume-slider"
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
        {muted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
      </IconButton>
      <Slider
        value={volume}
        onChange={handleVolumeChange}
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
          '& .M_uiSlider-track': { height: 3 },
          '& .MuiSlider-rail': { height: 3 },
        }}
        aria-labelledby="volume-slider"
      />
    </Stack>
  )
}

export default memo(VolumeSlider)
