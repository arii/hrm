// File: app/client/control/components/TimerControls.tsx
'use client'
// File: app/client/control/components/TimerControls.tsx
'use client'
import { useDebounce } from '@/hooks/useDebounce'
import { useSpotifyControls } from '@/hooks/useSpotifyControls'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  TimerCommandMessage,
  TimerConfigMessage,
  TimerModeCommandMessage,
} from '@/types/websocket'
import FitnessCenter from '@mui/icons-material/FitnessCenter'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Stop from '@mui/icons-material/Stop'
import Timer from '@mui/icons-material/Timer'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  DISCONNECTED_UI_REVERT_DELAY,
  OPTIMISTIC_ACTION_TIMEOUT,
} from '../constants'
import DurationStepper from './DurationStepper'

const actionButtonBaseSx = {
  flex: 1,
  width: '100%',
  fontWeight: 'bold',
  py: 1,
  minHeight: '48px',
  color: 'white',
  borderRadius: 2,
}

const startButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
}

const stopButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
  boxShadow: '0 8px 24px rgba(244, 63, 94, 0.4)',
}

const TimerControls = () => {
  const { timerData, sendData, connectionStatus } = useWebSocket()
  const { sendSpotifyCommand } = useSpotifyControls()
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)
  const [optimisticAction, setOptimisticAction] = useState<
    'START' | 'STOP' | null
  >(null)

  const debouncedWorkTime = useDebounce(workTime, 500)
  const debouncedRestTime = useDebounce(restTime, 500)

  // When the server's running state changes, it becomes the source of truth.
  // We clear any optimistic action to ensure the UI reflects the server state.
  useEffect(() => {
    if (optimisticAction !== null) {
      setOptimisticAction(null)
    }
    // Disabling the lint rule because we intentionally want this effect to run
    // ONLY when timerData.isRunning changes, to synchronize the client state
    // with the server's ground truth. Adding optimisticAction to the dependency
    // array would cause an infinite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerData.isRunning])

  // Safety timeout to clear the optimistic action if the server doesn't
  // confirm it within a reasonable time.
  useEffect(() => {
    if (optimisticAction) {
      const timer = setTimeout(() => {
        console.warn(
          `[TimerControls] Optimistic action "${optimisticAction}" timed out. Reverting UI.`
        )
        setOptimisticAction(null)
      }, OPTIMISTIC_ACTION_TIMEOUT)
      return () => clearTimeout(timer)
    }
    return () => {}
  }, [optimisticAction])

  useEffect(() => {
    if (connectionStatus !== 'Connected') return

    const message: TimerConfigMessage = {
      type: 'TIMER_CONFIG',
      workDuration: debouncedWorkTime,
      restDuration: debouncedRestTime,
    }
    sendData(message)
  }, [debouncedWorkTime, debouncedRestTime, sendData, connectionStatus])

  const sendTimerCommand = useCallback(
    (command: 'START' | 'STOP') => {
      // Optimistically update the UI
      setOptimisticAction(command)

      // If disconnected, revert the optimistic update after a short delay
      if (connectionStatus !== 'Connected') {
        console.warn(
          `[TimerControls] WebSocket not connected (status: ${connectionStatus}). Failed to send "${command}" command. Reverting optimistic UI.`
        )
        setTimeout(() => {
          setOptimisticAction(null)
        }, DISCONNECTED_UI_REVERT_DELAY)
        return
      }

      // When starting, send the most up-to-date config.
      if (command === 'START') {
        const config: TimerConfigMessage = {
          type: 'TIMER_CONFIG',
          workDuration: workTime,
          restDuration: restTime,
        }
        sendData(config)
      }
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command }
      sendData(message)

      if (command === 'START') sendSpotifyCommand('NEXT')
      else if (command === 'STOP') sendSpotifyCommand('PAUSE')
    },
    [sendData, sendSpotifyCommand, connectionStatus, workTime, restTime]
  )

  const sendModeCommand = (mode: 'TABATA' | 'STOPWATCH') => {
    if (connectionStatus !== 'Connected') return
    const message: TimerModeCommandMessage = { type: 'SET_MODE', mode }
    sendData(message)
  }

  // Derive the running state from the server state and any optimistic action.
  const isRunning =
    optimisticAction === 'START'
      ? true
      : optimisticAction === 'STOP'
        ? false
        : timerData.isRunning

  const controlsDisabled = isRunning || connectionStatus !== 'Connected'
  const modes = ['TABATA', 'STOPWATCH']

  return (
    <Card
      data-testid="timer-controls"
      sx={{
        mb: 0,
        position: 'sticky',
        top: 8,
        zIndex: 1000,
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="subtitle1"
            data-testid="timer-mode-heading"
            sx={{
              color: 'white',
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
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              p: '4px',
            }}
          >
            {modes.map((mode) => (
              <Button
                key={mode}
                data-testid={
                  mode === 'TABATA'
                    ? 'tabata-mode-button'
                    : 'stopwatch-mode-button'
                }
                onClick={() => sendModeCommand(mode as 'TABATA' | 'STOPWATCH')}
                disabled={controlsDisabled}
                startIcon={mode === 'TABATA' ? <FitnessCenter /> : <Timer />}
                sx={{
                  color: 'white',
                  zIndex: 1,
                  transition: 'color 0.3s',
                  borderRadius: '20px',
                  py: 1,
                }}
              >
                {mode.charAt(0) + mode.slice(1).toLowerCase()}
              </Button>
            ))}
            <motion.div
              layoutId="pill-switch"
              transition={{ type: 'spring', duration: 0.4 }}
              style={{
                position: 'absolute',
                top: '4px',
                left: timerData.mode === 'TABATA' ? '4px' : 'calc(50% - 4px)',
                width: 'calc(50% - 4px)',
                height: 'calc(100% - 8px)',
                background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                borderRadius: '20px',
                zIndex: 0,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{ color: 'white', mb: 0.5 }}
            data-testid={isRunning ? 'timer-running' : 'timer-stopped'}
          >
            {isRunning ? 'Timer Running' : 'Timer Stopped'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#EF4444' }}>
            {timerData.currentPhase}
          </Typography>
        </Box>

        {timerData.mode === 'TABATA' && (
          <Stack spacing={3} sx={{ mb: 2 }}>
            <Box>
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 'medium',
                  mb: 1,
                  fontSize: '0.9rem',
                  textAlign: 'center',
                }}
              >
                Timer Presets
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setWorkTime(20)
                    setRestTime(10)
                  }}
                  disabled={controlsDisabled}
                  sx={{
                    flex: 1,
                    backgroundColor: 'secondary.dark',
                    '&:hover': { backgroundColor: 'secondary.main' },
                  }}
                  data-testid="timer-preset-tabata-button"
                >
                  Tabata (20/10)
                </Button>
                <Button
                  variant="contained"
                  onClick={() => {
                    setWorkTime(60)
                    setRestTime(60)
                  }}
                  disabled={controlsDisabled}
                  sx={{
                    flex: 1,
                    backgroundColor: 'secondary.dark',
                    '&:hover': { backgroundColor: 'secondary.main' },
                  }}
                  data-testid="timer-preset-emom-button"
                >
                  EMOM (60/60)
                </Button>
              </Stack>
            </Box>
            <Card
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2,
                background: 'rgba(255, 255, 255, 0.05)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Stack spacing={2}>
                <DurationStepper
                  label="Work Duration (s)"
                  value={workTime}
                  onChange={setWorkTime}
                  disabled={controlsDisabled}
                  color="#EF4444"
                  data-testid="work-duration-input"
                />
                <DurationStepper
                  label="Rest Duration (s)"
                  value={restTime}
                  onChange={setRestTime}
                  disabled={controlsDisabled}
                  color="#22C55E"
                  data-testid="rest-duration-input"
                />
              </Stack>
            </Card>
          </Stack>
        )}

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
                onClick={() => sendTimerCommand('START')}
                disabled={connectionStatus !== 'Connected'}
                sx={startButtonSx}
                startIcon={<PlayArrow fontSize="large" />}
              >
                START
              </Button>
            ) : (
              <Button
                data-testid="stop-timer-button"
                variant="contained"
                onClick={() => sendTimerCommand('STOP')}
                disabled={connectionStatus !== 'Connected'}
                sx={stopButtonSx}
                startIcon={<Stop fontSize="large" />}
              >
                STOP
              </Button>
            )}
          </motion.div>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default TimerControls
