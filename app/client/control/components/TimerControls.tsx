// File: app/client/control/components/TimerControls.tsx
'use client'
import { useDebounce } from '@/hooks/useDebounce'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  SpotifyCommandMessage,
  TimerCommandMessage,
  TimerConfigMessage,
  TimerModeCommandMessage,
} from '@/types/websocket'
import { API_SPOTIFY_DEVICES } from '@/constants/apiEndpoints'
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
import DurationStepper from './DurationStepper'
import { alpha, Theme } from '@mui/material/styles'

// Constants
const OPTIMISTIC_UI_SYNC_TIMEOUT =
  process.env.NEXT_PUBLIC_APP_ENV === 'test' ? 5000 : 3000 // ms
const DISCONNECTED_UI_REVERT_DELAY = 500 // ms

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

const TimerControls = () => {
  const { timerData, sendData, connectionStatus } = useWebSocket()
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)
  const [optimisticIsRunning, setOptimisticIsRunning] = useState(
    timerData.isRunning
  )

  const debouncedWorkTime = useDebounce(workTime, 500)
  const debouncedRestTime = useDebounce(restTime, 500)

  // Sync optimistic state with server state
  useEffect(() => {
    setOptimisticIsRunning(timerData.isRunning)
  }, [timerData.isRunning])

  // Safety timeout to prevent optimistic UI from getting stuck.
  // If the optimistic state and server state are different for too long,
  // revert the optimistic state to match the server.
  useEffect(() => {
    if (optimisticIsRunning === timerData.isRunning) {
      return // States are in sync, do nothing.
    }

    const safetyTimeout = setTimeout(() => {
      console.warn(
        `[TimerControls] Optimistic state timed out. Reverting to server state (isRunning: ${timerData.isRunning}).`
      )
      setOptimisticIsRunning(timerData.isRunning)
    }, OPTIMISTIC_UI_SYNC_TIMEOUT)

    // Cleanup the timeout if the states sync up before it fires
    return () => clearTimeout(safetyTimeout)
  }, [optimisticIsRunning, timerData.isRunning])

  useEffect(() => {
    const message: TimerConfigMessage = {
      type: 'TIMER_CONFIG',
      workDuration: debouncedWorkTime,
      restDuration: debouncedRestTime,
    }
    sendData(message)
  }, [debouncedWorkTime, debouncedRestTime, sendData])

  interface SpotifyDevice {
    id: string
    name: string
    is_active?: boolean
  }
  const [spotifyDeviceId, setSpotifyDeviceId] = useState<string>('')
  const [spotifyDevices, setSpotifyDevices] = useState<SpotifyDevice[]>([])
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(API_SPOTIFY_DEVICES)
        if (!response.ok) throw new Error('Failed to fetch devices')
        const devices: SpotifyDevice[] = await response.json()
        setSpotifyDevices(Array.isArray(devices) ? devices : [])
        const activeDevice = devices.find((d) => d.is_active)
        setSpotifyDeviceId(
          activeDevice ? activeDevice.id : devices[0]?.id || ''
        )
      } catch (_err) {
        setSpotifyDevices([])
        setSpotifyDeviceId('')
      }
    }
    fetchDevices()
  }, [])

  const sendSpotifyCommand = useCallback(
    (command: 'NEXT' | 'PAUSE') => {
      let deviceId: string | null = spotifyDeviceId
      if (!deviceId && spotifyDevices.length > 0) {
        const activeDevice = spotifyDevices.find((d) => d.is_active)
        deviceId = activeDevice
          ? activeDevice.id
          : spotifyDevices[0]?.id || null
        if (deviceId) setSpotifyDeviceId(deviceId)
      }
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        ...(deviceId ? { deviceId } : {}),
      }
      sendData(message)
    },
    [sendData, spotifyDeviceId, spotifyDevices]
  )

  const sendTimerCommand = useCallback(
    (command: 'START' | 'STOP') => {
      // Optimistically update the UI
      setOptimisticIsRunning(command === 'START')

      // If disconnected, revert the optimistic update after a short delay
      if (connectionStatus !== 'Connected') {
        console.warn(
          `[TimerControls] WebSocket not connected (status: ${connectionStatus}). Failed to send "${command}" command. Reverting optimistic UI.`
        )
        setTimeout(
          () => setOptimisticIsRunning(timerData.isRunning),
          DISCONNECTED_UI_REVERT_DELAY
        )
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
    [
      sendData,
      sendSpotifyCommand,
      connectionStatus,
      timerData.isRunning,
      workTime,
      restTime,
    ]
  )

  const sendModeCommand = (mode: 'TABATA' | 'STOPWATCH') => {
    if (connectionStatus !== 'Connected') return
    const message: TimerModeCommandMessage = { type: 'SET_MODE', mode }
    sendData(message)
  }

  const controlsDisabled =
    optimisticIsRunning || connectionStatus !== 'Connected'
  const modes = ['TABATA', 'STOPWATCH']

  return (
    <Card
      sx={(theme) => ({
        mb: 0,
        position: 'sticky',
        top: 8,
        zIndex: 1000,
        background: alpha(theme.palette.grey[800], 0.7),
        backdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        borderRadius: 3,
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`,
      })}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
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
              backgroundColor: (theme) =>
                alpha(theme.palette.common.white, 0.1),
              borderRadius: '24px',
              p: '4px',
            }}
          >
            {modes.map((mode) => (
              <Button
                key={mode}
                onClick={() => sendModeCommand(mode as 'TABATA' | 'STOPWATCH')}
                disabled={controlsDisabled}
                startIcon={mode === 'TABATA' ? <FitnessCenter /> : <Timer />}
                sx={{
                  color: 'common.white',
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
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
                borderRadius: '20px',
                zIndex: 0,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{ color: 'common.white', mb: 0.5 }}
            data-testid={
              optimisticIsRunning ? 'timer-running' : 'timer-stopped'
            }
          >
            {optimisticIsRunning ? 'Timer Running' : 'Timer Stopped'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {timerData.currentPhase}
          </Typography>
        </Box>

        {timerData.mode === 'TABATA' && (
          <Stack spacing={3} sx={{ mb: 2 }}>
            <Box>
              <Typography
                sx={{
                  color: 'common.white',
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
                >
                  EMOM (60/60)
                </Button>
              </Stack>
            </Box>
            <Card
              variant="outlined"
              sx={(theme) => ({
                p: 2,
                borderRadius: 2,
                background: alpha(theme.palette.common.white, 0.05),
                borderColor: alpha(theme.palette.common.white, 0.1),
              })}
            >
              <Stack spacing={2}>
                <DurationStepper
                  label="Work Duration (s)"
                  value={workTime}
                  onChange={setWorkTime}
                  disabled={controlsDisabled}
                  color="error.main"
                />
                <DurationStepper
                  label="Rest Duration (s)"
                  value={restTime}
                  onChange={setRestTime}
                  disabled={controlsDisabled}
                  color="success.main"
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
            {!optimisticIsRunning ? (
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
