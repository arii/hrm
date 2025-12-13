// app/client/components/CurrentHeartRateDisplay.tsx
'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Theme } from '@mui/material/styles'

interface CurrentHeartRateDisplayProps {
  bpm: number | null | undefined
  isAlerting?: boolean
}

const CurrentHeartRateDisplay = ({
  bpm,
  isAlerting = false,
}: CurrentHeartRateDisplayProps) => {
  const displayValue = bpm ?? '---'
  const isBpmAvailable = bpm != null && bpm > 0

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="h1" // Apply the base h1 style directly
        data-testid="live-hr-value"
        component="div"
        sx={(theme: Theme) => ({
          fontFamily: 'monospace', // Override for mono look
          my: theme.spacing(0.5),
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          animation: 'subtle-pulse 2s infinite ease-in-out',
          animationPlayState:
            isBpmAvailable && !isAlerting ? 'running' : 'paused',
          color: theme.palette.common.white,
        })}
      >
        {displayValue}
      </Typography>
      {isBpmAvailable && (
        <Typography
          variant="h6"
          sx={(theme: Theme) => ({
            color: theme.palette.common.white,
          })}
        >
          BPM
        </Typography>
      )}
    </Box>
  )
}

export default CurrentHeartRateDisplay
