// components/VolumeControl.tsx
'use client'
import { useAudio } from '@/context/AudioContext'
import Box from '@mui/material/Box'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import VolumeDown from '@mui/icons-material/VolumeDown'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeOff from '@mui/icons-material/VolumeOff'
import VolumeMute from '@mui/icons-material/VolumeMute'

export default function VolumeControl() {
  const { volume, setVolume, isMuted, toggleMute } = useAudio()

  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    setVolume(newValue as number)
  }

  return (
    <Box sx={{ width: 200, padding: '0 16px' }}>
      <Stack spacing={2} direction="row" sx={{ mb: 1 }} alignItems="center">
        <IconButton onClick={toggleMute} aria-label="toggle mute">
          {isMuted ? (
            <VolumeOff />
          ) : volume > 50 ? (
            <VolumeUp />
          ) : volume > 0 ? (
            <VolumeDown />
          ) : (
            <VolumeMute />
          )}
        </IconButton>
        <Slider
          aria-label="Volume"
          value={isMuted ? 0 : volume}
          onChange={handleSliderChange}
          disabled={isMuted}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={isMuted ? 0 : volume}
          aria-valuetext={`${isMuted ? 'Muted' : `${volume}%`}`}
        />
      </Stack>
    </Box>
  )
}
