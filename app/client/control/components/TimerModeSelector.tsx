// File: app/client/control/components/TimerModeSelector.tsx
'use client'
import FitnessCenter from '@mui/icons-material/FitnessCenter'
import Timer from '@mui/icons-material/Timer'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import { useTheme, alpha } from '@mui/material/styles'
import { motion } from 'framer-motion'
import { TimerMode } from '@/types/core'

interface TimerModeSelectorProps {
  mode: TimerMode
  disabled: boolean
  onSelect: (mode: TimerMode) => void
}

const MODES: TimerMode[] = ['TABATA', 'STOPWATCH']

const TimerModeSelector = ({
  mode,
  disabled,
  onSelect,
}: TimerModeSelectorProps) => {
  const theme = useTheme()

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography
        variant="subtitle1"
        data-testid="timer-mode-heading"
        sx={{
          color: 'common.white',
          fontWeight: 'medium',
          mb: 1,
          textAlign: 'center',
        }}
      >
        Timer Mode
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          position: 'relative',
          backgroundColor: alpha(theme.palette.common.white, 0.1),
          borderRadius: '24px',
          p: '4px',
        }}
      >
        {MODES.map((m) => (
          <Button
            key={m}
            data-testid={
              m === 'TABATA' ? 'tabata-mode-button' : 'stopwatch-mode-button'
            }
            onClick={() => onSelect(m)}
            disabled={disabled}
            startIcon={m === 'TABATA' ? <FitnessCenter /> : <Timer />}
            sx={{
              color: 'common.white',
              zIndex: 1,
              transition: 'color 0.3s',
              borderRadius: '20px',
              py: 1,
            }}
          >
            {m.charAt(0) + m.slice(1).toLowerCase()}
          </Button>
        ))}
        <motion.div
          layoutId="pill-switch"
          transition={{ type: 'spring', duration: 0.4 }}
          style={{
            position: 'absolute',
            top: '4px',
            left: mode === 'TABATA' ? '4px' : 'calc(50% - 4px)',
            width: 'calc(50% - 4px)',
            height: 'calc(100% - 8px)',
            background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
            borderRadius: '20px',
            zIndex: 0,
          }}
        />
      </Box>
    </Box>
  )
}

export default TimerModeSelector
