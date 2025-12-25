'use client'
import { useAudioContext } from '@/context/AudioContext'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import Slider from '@mui/material/Slider'
import VolumeDown from '@mui/icons-material/VolumeDown'
import VolumeUp from '@mui/icons-material/VolumeUp'
import VolumeOff from '@mui/icons-material/VolumeOff'

interface TimerVolumeControlProps {
  textColor: string
  thumbColor: string
}

export const TimerVolumeControl = ({
  textColor,
  thumbColor,
}: TimerVolumeControlProps) => {
  const { volume, setVolume, muted, toggleMute } = useAudioContext()

  return (
    <Stack
      spacing={{ xs: 1, sm: 2 }}
      direction="row"
      sx={{
        mt: 2,
        mb: 1,
        width: { xs: '90%', md: '80%' },
        maxWidth: 300,
        color: textColor,
      }}
      alignItems="center"
    >
      <IconButton onClick={toggleMute} color="inherit">
        {muted || volume === 0 ? <VolumeOff /> : <VolumeDown />}
      </IconButton>
      <Slider
        aria-label="Volume"
        value={muted ? 0 : volume}
        onChange={(_, newValue) => setVolume(newValue as number)}
        sx={{
          color: 'inherit',
          '& .MuiSlider-thumb': {
            color: thumbColor,
          },
        }}
      />
      <VolumeUp />
    </Stack>
  )
}
