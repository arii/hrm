// File: components/TimerSoundProvider.tsx
'use client'
import { useAudio } from '@/hooks/useAudio'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface TimerSoundProviderProps {
  children: React.ReactNode
}

const TimerSoundProvider = ({ children }: TimerSoundProviderProps) => {
  const { isAudioContextUnlocked, unlockAudio } = useAudio()

  return (
    <Box onClick={unlockAudio} sx={{ cursor: 'pointer' }}>
      {!isAudioContextUnlocked && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            zIndex: 1000,
            animation: 'pulse 1.5s infinite',
          }}
        >
          <Typography variant="body2">
            Click anywhere to enable timer sounds
          </Typography>
        </Box>
      )}
      {children}
    </Box>
  )
}

export default TimerSoundProvider
