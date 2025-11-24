// components/Spotify/VolumeControl.tsx
import React from 'react'
<<<<<<< HEAD
import { Slider, Stack, Typography, Box } from '@mui/material'
=======
>>>>>>> origin/leader
import { VolumeUp } from '@mui/icons-material'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted: (volume: number) => void
  width?: number | string
  showValue?: boolean
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  onVolumeChangeCommitted,
  width,
  showValue = true,
}) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <VolumeUp sx={{ color: 'grey.400', fontSize: 18 }} />
      <Slider
        value={volume}
        onChange={(_, val) => onVolumeChange(val as number)}
        onChangeCommitted={(_, val) => onVolumeChangeCommitted(val as number)}
        min={0}
        max={100}
        size="small"
        sx={{
          width: width,
          color: '#1DB954',
          '& .MuiSlider-thumb': {
            backgroundColor: 'white',
            width: 12,
            height: 12,
          },
          '& .MuiSlider-track': { height: 3 },
          '& .MuiSlider-rail': { height: 3 },
        }}
      />
      {showValue && (
        <Typography
          variant="caption"
          sx={{ color: 'grey.400', minWidth: '3ch' }}
        >
          {volume}
        </Typography>
      )}
    </Stack>
  )
}

export default VolumeControl
