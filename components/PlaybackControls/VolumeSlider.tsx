// components/PlaybackControls/VolumeSlider.tsx
'use client'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeOff from '@mui/icons-material/VolumeOff'
import { visuallyHidden } from '@mui/utils'
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
      <Typography id="volume-slider-label" sx={visuallyHidden}>
        Volume
      </Typography>
      <IconButton
        onClick={onToggleMute}
        sx={(theme) => ({
          color: muted ? 'error.main' : 'grey.400',
          '&:hover': { color: 'white' },
          width: theme.spacing(6),
          height: theme.spacing(6),
        })}
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeOff /> : <VolumeUp />}
      </IconButton>
      <Slider
        value={muted ? 0 : volume}
        onChange={handleVolumeChange}
        min={0}
        max={100}
        aria-labelledby="volume-slider-label"
        aria-valuetext={muted ? 'Muted' : `${volume}%`}
        sx={{
          color: '#1DB954',
          '& .MuiSlider-thumb': {
            backgroundColor: 'white',
            width: 24,
            height: 24,
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0px 0px 0px 8px rgba(29, 185, 84, 0.16)',
            },
          },
          '& .MuiSlider-track': { height: 4 },
          '& .MuiSlider-rail': { height: 4 },
        }}
      />
    </Stack>
  )
}

export default memo(VolumeSlider)
