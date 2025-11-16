// File: app/client/control/components/TimerControls.tsx
'use client'
import {
  FitnessCenter,
  Timer,
  Add,
  Remove,
  PlayArrow,
  Stop,
} from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
  Grid,
} from '@mui/material'
import { TimerCommandMessage, TimerModeCommandMessage } from '@/types/websocket'
import useWebSocket from '@/hooks/useWebSocket'
import { useState, useCallback, useEffect } from 'react'

const DurationControl = ({
  label,
  value,
  onIncrement,
  onDecrement,
  onChange,
  color,
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  color: 'primary' | 'success'
}) => (
  <Box>
    <Typography variant="h6" align="center" gutterBottom>
      {label}
    </Typography>
    <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
      <IconButton
        onClick={onDecrement}
        aria-label={`Decrease ${label}`}
        color="secondary"
        size="large"
      >
        <Remove fontSize="large" />
      </IconButton>
      <TextField
        type="number"
        value={value}
        onChange={onChange}
        inputProps={{
          min: 0,
          step: 5,
          style: {
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '2.5rem',
          },
        }}
        sx={{
          width: '100px',
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: `${color}.main` },
            '&:hover fieldset': { borderColor: `${color}.dark` },
          },
          '& .MuiInputBase-input': {
            color: `${color}.main`,
          },
        }}
        aria-label={label}
      />
      <IconButton
        onClick={onIncrement}
        aria-label={`Increase ${label}`}
        color="secondary"
        size="large"
      >
        <Add fontSize="large" />
      </IconButton>
    </Stack>
  </Box>
)

const TimerControls = () => {
  const { timerData, sendData } = useWebSocket()
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)

  useEffect(() => {
    setWorkTime(timerData.workDuration ?? 20)
    setRestTime(timerData.restDuration ?? 10)
  }, [timerData.workDuration, timerData.restDuration])

  const sendTimerCommand = useCallback(
    (command: 'START' | 'PAUSE' | 'STOP') => {
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command }
      sendData(message)
    },
    [sendData]
  )

  const sendModeCommand = useCallback(
    (mode: 'TABATA' | 'STOPWATCH') => {
      const message: TimerModeCommandMessage = { type: 'SET_MODE', mode }
      sendData(message)
    },
    [sendData]
  )

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Timer Mode Selection */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Timer Mode
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant={timerData.mode === 'TABATA' ? 'contained' : 'outlined'}
              onClick={() => sendModeCommand('TABATA')}
              disabled={timerData.isRunning}
              startIcon={<FitnessCenter />}
              sx={{ flex: 1 }}
            >
              Tabata
            </Button>
            <Button
              variant={
                timerData.mode === 'STOPWATCH' ? 'contained' : 'outlined'
              }
              onClick={() => sendModeCommand('STOPWATCH')}
              disabled={timerData.isRunning}
              startIcon={<Timer />}
              sx={{ flex: 1 }}
            >
              Stopwatch
            </Button>
          </Stack>
        </Box>

        {/* Timer Status Display */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
            {timerData.isRunning ? 'Active' : 'Idle'}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {timerData.currentPhase}{' '}
            {timerData.mode === 'TABATA' &&
              timerData.cycle > 0 &&
              `• Cycle ${timerData.cycle}/${timerData.totalCycles}`}
          </Typography>
        </Box>

        {/* Tabata Duration Controls */}
        {timerData.mode === 'TABATA' && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <DurationControl
                label="Work (s)"
                value={workTime}
                onDecrement={() => setWorkTime((prev) => Math.max(5, prev - 5))}
                onIncrement={() => setWorkTime((prev) => prev + 5)}
                onChange={(e) =>
                  setWorkTime(Math.max(5, parseInt(e.target.value) || 0))
                }
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <DurationControl
                label="Rest (s)"
                value={restTime}
                onDecrement={() => setRestTime((prev) => Math.max(0, prev - 5))}
                onIncrement={() => setRestTime((prev) => prev + 5)}
                onChange={(e) =>
                  setRestTime(Math.max(0, parseInt(e.target.value) || 0))
                }
                color="success"
              />
            </Grid>
          </Grid>
        )}

        {/* Start/Stop Controls */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            color="success"
            onClick={() => sendTimerCommand('START')}
            sx={{ flex: 1, py: 1.5 }}
            startIcon={<PlayArrow />}
            size="large"
          >
            Start
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => sendTimerCommand('STOP')}
            sx={{ flex: 1, py: 1.5 }}
            startIcon={<Stop />}
            size="large"
          >
            Stop
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default TimerControls
