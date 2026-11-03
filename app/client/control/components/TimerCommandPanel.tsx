// File: app/client/control/components/TimerCommandPanel.tsx
'use client'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Stop from '@mui/icons-material/Stop'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import { useTheme, alpha, Theme } from '@mui/material/styles'
import { motion } from 'framer-motion'

interface TimerCommandPanelProps {
  isRunning: boolean
  disabled: boolean
  onStart: () => void
  onStop: () => void
}

const actionButtonBaseSx = {
  flex: 1,
  width: '100%',
  fontWeight: 'bold',
  py: 1,
  minHeight: '48px',
  color: 'common.white',
  borderRadius: 2,
}

const startButtonSx = (theme: Theme) => ({
  ...actionButtonBaseSx,
  background: `linear-gradient(135deg, ${theme.palette.success.main} 0%, ${theme.palette.success.dark} 100%)`,
  boxShadow: `0 8px 24px ${alpha(theme.palette.success.main, 0.4)}`,
})

const stopButtonSx = (theme: Theme) => ({
  ...actionButtonBaseSx,
  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
  boxShadow: `0 8px 24px ${alpha(theme.palette.error.main, 0.4)}`,
})

const TimerCommandPanel = ({
  isRunning,
  disabled,
  onStart,
  onStop,
}: TimerCommandPanelProps) => {
  const theme = useTheme()

  return (
    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
      <motion.div
        style={{ flex: 1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {!isRunning ? (
          <Button
            data-testid="start-timer-button"
            variant="contained"
            onClick={onStart}
            disabled={disabled}
            sx={startButtonSx(theme)}
            startIcon={<PlayArrow fontSize="large" />}
          >
            START
          </Button>
        ) : (
          <Button
            data-testid="stop-timer-button"
            variant="contained"
            onClick={onStop}
            disabled={disabled}
            sx={stopButtonSx(theme)}
            startIcon={<Stop fontSize="large" />}
          >
            STOP
          </Button>
        )}
      </motion.div>
    </Stack>
  )
}

export default TimerCommandPanel
