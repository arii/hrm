// components/Spotify/VolumeControl.tsx
import React from 'react'
import VolumeUp from '@mui/icons-material/VolumeUp'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

interface VolumeControlProps {
  volume: number
  onVolumeChange: (volume: number) => void
  onVolumeChangeCommitted: (volume: number) => void
}

const VolumeControl: React.FC<VolumeControlProps> = ({
  volume,
  onVolumeChange,
  onVolumeChangeCommitted,
}) => {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <VolumeUp sx={{ color: 'grey.400', fontSize: 20 }} />
      <Slider
        aria-label="Volume control"
        value={volume}
        onChange={(_, val) => onVolumeChange(val as number)}
        onChangeCommitted={(_, val) => onVolumeChangeCommitted(val as number)}
        min={0}
        max={100}
        size="small"
        sx={{
          color: '#1DB954',
          '& .MuiSlider-thumb': {
            backgroundColor: 'white',
            '&:hover, &.Mui-focusVisible': {
              boxShadow: '0px 0px 0px 8px rgba(29, 185, 84, 0.16)',
            },
          },
        }}
      />
      <Typography variant="caption" sx={{ color: 'grey.400', minWidth: '3ch' }}>
        {volume}
      </Typography>
    </Stack>
  )
}

export default VolumeControl
