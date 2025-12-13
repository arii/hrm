// app/components/CurrentHeartRateDisplay.tsx
'use client'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

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
        data-testid="live-hr-value"
        component="div" // Use div to contain both number and label
        sx={{
          fontFamily: 'var(--font-roboto-mono), "Courier New", monospace',
          fontSize: { xs: '5rem', sm: '6rem', md: '7rem' },
          fontWeight: 900,
          lineHeight: 0.85,
          my: 0.5,
          textShadow: '0 2px 4px rgba(0,0,0,0.2)',
          animation: 'subtle-pulse 2s infinite ease-in-out',
          animationPlayState: isBpmAvailable && !isAlerting ? 'running' : 'paused',
          color: 'white', // Assuming it will be on a colored background
        }}
      >
        {displayValue}
      </Typography>
      {isBpmAvailable && (
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.6rem' },
            color: 'white',
          }}
        >
          BPM
        </Typography>
      )}
    </Box>
  )
}

export default CurrentHeartRateDisplay
