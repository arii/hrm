// components/Spotify/VolumeControl.tsx
'use client'

import Slider from '@mui/material/Slider'
import Box from '@mui/material/Box'
import VolumeDown from '@mui/icons-material/VolumeDown'
import VolumeUp from '@mui/icons-material/VolumeUp'

interface VolumeControlProps {
  value: number
  onChange: (value: number | number[]) => void
}

const VolumeControl = ({ value, onChange }: VolumeControlProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center' }}>
      <VolumeDown />
      <Slider
        value={value}
        onChange={(_, newValue) => onChange(newValue)}
        aria-labelledby="continuous-slider"
        sx={{ mx: 2 }}
      />
      <VolumeUp />
    </Box>
  )
}

export default VolumeControl
