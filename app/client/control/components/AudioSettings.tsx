'use client'
import { VolumeUp } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
  Slider,
  Stack,
  Typography,
} from '@mui/material'
import { useCallback, useRef } from 'react'
import useVolumePreference from '@/hooks/useVolumePreference'

const AudioSettings = () => {
  const { volume, setVolume } = useVolumePreference(70)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleTestSound = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/beep-07.wav')
    }
    // Apply logarithmic scaling to match the actual timer behavior
    // or linear if that matches your preference logic.
    // Here we use the direct volume percent for simplicity,
    // but you can import volumeToScalar if strict parity is needed.
    audioRef.current.volume = Math.min(Math.max(volume / 100, 0), 1)
    audioRef.current.currentTime = 0
    audioRef.current.play().catch((err) => console.warn('Test sound failed:', err))
  }, [volume])

  return (
    <Card
      sx={{
        boxShadow: 3,
        mb: 3,
        backgroundColor: 'grey.900',
        color: 'white',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <VolumeUp sx={{ mr: 1 }} /> Audio Settings
        </Typography>

        <Stack spacing={2} alignItems="center">
          <Box sx={{ width: '100%', px: 2 }}>
            <Typography variant="body2" sx={{ color: 'grey.400', mb: 1 }}>
              Master Volume ({volume}%)
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <VolumeUp sx={{ color: 'grey.500', fontSize: 20 }} />
              <Slider
                value={volume}
                onChange={(_, val) => setVolume(val as number)}
                min={0}
                max={100}
                valueLabelDisplay="auto"
                sx={{
                  color: '#3B82F6', // Blue to differentiate from Spotify
                  '& .MuiSlider-thumb': { backgroundColor: 'white' },
                }}
              />
            </Stack>
          </Box>

          <Button
            variant="outlined"
            onClick={handleTestSound}
            size="small"
            sx={{
              color: '#3B82F6',
              borderColor: '#3B82F6',
              '&:hover': {
                borderColor: '#2563EB',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              },
            }}
          >
            Test Sound
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default AudioSettings
