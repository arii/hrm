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
import Add from '@mui/icons-material/Add'
import FitnessCenter from '@mui/icons-material/FitnessCenter'
import PlayArrow from '@mui/icons-material/PlayArrow'
import Remove from '@mui/icons-material/Remove'
import Stop from '@mui/icons-material/Stop'
import Timer from '@mui/icons-material/Timer'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'
import useTimerVolume from '@/hooks/useTimerVolume'
import VolumeControl from '@/components/shared/VolumeControl'

const actionButtonBaseSx = {
  flex: 1,
  fontWeight: 'bold',
  py: 1,
  minHeight: '48px',
  transition: 'transform 0.1s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)',
  },
}

const startButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(16, 185, 129, 0.5)',
  },
}

const stopButtonSx = {
  ...actionButtonBaseSx,
  background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 12px 32px rgba(239, 68, 68, 0.5)',
  },
}

const stepperButtonSx = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  '&:hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
  },
  width: 48,
  height: 48,
}

const TimerControls = () => {
  const { timerData, sendData, connectionStatus } = useWebSocket()
  const { volume, muted, handleVolumeChange, handleToggleMute } =
    useTimerVolume()

  // Local state is source of truth for editing
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)

  const debouncedWorkTime = useDebounce(workTime, 500)
  const debouncedRestTime = useDebounce(restTime, 500)
  // Track latest numeric values synchronously to avoid stale state on click
  const latestWork = useRef<number>(workTime)
  const latestRest = useRef<number>(restTime)

  // Keep refs synchronized with state
  useEffect(() => {
    latestWork.current = workTime
  }, [workTime])

  useEffect(() => {
    latestRest.current = restTime
  }, [restTime])

  // Send settings update to server when local state changes
  useEffect(() => {
    const message: TimerConfigMessage = {
      type: 'TIMER_CONFIG',
      workDuration: debouncedWorkTime,
      restDuration: debouncedRestTime,
    }
    sendData(message)
  }, [debouncedWorkTime, debouncedRestTime, sendData])

  // Get deviceId from SpotifyControls context or fallback to active device
  interface SpotifyDevice {
    id: string
    name: string
    is_active?: boolean
    is_private_session?: boolean
    is_restricted?: boolean
    type?: string
    volume_percent?: number
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
        const firstDevice = spotifyDevices[0]
        deviceId = activeDevice ? activeDevice.id : firstDevice?.id || null
        if (deviceId) {
          setSpotifyDeviceId(deviceId)
        }
      }
      /*if (!deviceId) {
        logger.warn('No deviceId available, Spotify command not sent.')
        return
      }*/
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        // FIX: Use spread to omit the key entirely if deviceId is null/undefined
        ...(deviceId ? { deviceId } : {}), //
        // deviceId: deviceId || '',
      }
      sendData(message)
    },
    [sendData, spotifyDeviceId, spotifyDevices]
  )

  const sendTimerCommand = useCallback(
    (command: 'START' | 'PAUSE' | 'STOP') => {
      if (connectionStatus !== 'Connected') return

      // When starting, ensure the server receives the latest configuration immediately
      if (command === 'START') {
        // Prefer reading the current ref values to avoid stale React state
        const config: TimerConfigMessage = {
          type: 'TIMER_CONFIG',
          workDuration: latestWork.current,
          restDuration: latestRest.current,
        }
        sendData(config)
      }
      const message: TimerCommandMessage = { type: 'TIMER_COMMAND', command }
      sendData(message)

      if (command === 'START') {
        sendSpotifyCommand('NEXT')
      } else if (command === 'STOP') {
        sendSpotifyCommand('PAUSE')
      }
    },
    [sendData, latestWork, latestRest, sendSpotifyCommand, connectionStatus]
  )

  const sendModeCommand = (mode: 'TABATA' | 'STOPWATCH') => {
    if (connectionStatus !== 'Connected') return
    const message: TimerModeCommandMessage = { type: 'SET_MODE', mode }
    sendData(message)
  }

  const controlsDisabled =
    timerData.isRunning || connectionStatus !== 'Connected'

  return (
    <Card
      sx={{
        mb: 0,
        color: '#EF4444',
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
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
        >
          <Typography
            variant="subtitle1"
            sx={{ color: 'white', fontWeight: 'medium' }}
          >
            Sound
          </Typography>
          <VolumeControl
            volume={volume}
            muted={muted}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
          />
        </Stack>
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
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              variant={timerData.mode === 'TABATA' ? 'contained' : 'outlined'}
              onClick={() => sendModeCommand('TABATA')}
              disabled={controlsDisabled}
              startIcon={<FitnessCenter />}
              data-testid="tabata-mode-button"
              sx={{
                flex: 1,
                color: timerData.mode === 'TABATA' ? 'white' : '#EF4444',
                backgroundColor:
                  timerData.mode === 'TABATA' ? '#EF4444' : 'transparent',
                borderColor: '#EF4444',
                '&:hover': {
                  backgroundColor:
                    timerData.mode === 'TABATA'
                      ? '#DC2626'
                      : 'rgba(239, 68, 68, 0.1)',
                  borderColor: '#DC2626',
                },
              }}
            >
              Tabata
            </Button>
            <Button
              variant={
                timerData.mode === 'STOPWATCH' ? 'contained' : 'outlined'
              }
              onClick={() => sendModeCommand('STOPWATCH')}
              disabled={controlsDisabled}
              startIcon={<Timer />}
              data-testid="stopwatch-mode-button"
              sx={{
                flex: 1,
                color: timerData.mode === 'STOPWATCH' ? 'white' : '#EF4444',
                backgroundColor:
                  timerData.mode === 'STOPWATCH' ? '#EF4444' : 'transparent',
                borderColor: '#EF4444',
                '&:hover': {
                  backgroundColor:
                    timerData.mode === 'STOPWATCH'
                      ? '#DC2626'
                      : 'rgba(239, 68, 68, 0.1)',
                  borderColor: '#DC2626',
                },
              }}
            >
              Stopwatch
            </Button>
          </Stack>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 0.5 }}>
            {timerData.isRunning ? 'Timer Running' : 'Timer Stopped'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#EF4444' }}>
            {timerData.currentPhase}
          </Typography>
        </Box>

        {timerData.mode === 'TABATA' && (
          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Box>
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 'medium',
                  mb: 0.5,
                  fontSize: '0.9rem',
                }}
              >
                Timer Presets
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setWorkTime(20)
                    setRestTime(10)
                  }}
                  disabled={controlsDisabled}
                  sx={{
                    flex: 1,
                    color: '#EF4444',
                    borderColor: '#EF4444',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderColor: '#DC2626',
                    },
                  }}
                >
                  Tabata (20/10)
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setWorkTime(60)
                    setRestTime(60)
                  }}
                  disabled={controlsDisabled}
                  sx={{
                    flex: 1,
                    color: '#22C55E',
                    borderColor: '#22C55E',
                    '&:hover': {
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderColor: '#16A34A',
                    },
                  }}
                >
                  EMOM (60/60)
                </Button>
              </Stack>
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 'medium',
                  mb: 0.5,
                  fontSize: '0.9rem',
                }}
              >
                {' '}
                Work Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1}
              >
                <Tooltip title="Decrease by 5s" arrow>
                  <IconButton
                    color="primary"
                    onClick={() => setWorkTime((prev) => Math.max(0, prev - 5))}
                    aria-label="Decrease work duration"
                    disabled={controlsDisabled}
                    sx={stepperButtonSx}
                  >
                    <Remove fontSize="large" />
                  </IconButton>
                </Tooltip>
                <TextField
                  type="number"
                  value={workTime}
                  disabled={controlsDisabled}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    // Prevent negative numbers
                    const next = Math.max(0, val)
                    latestWork.current = next
                    setWorkTime(next)
                  }}
                  inputProps={{
                    min: 0,
                    step: 5,
                    style: { textAlign: 'center' },
                    'data-testid': 'work-duration-input',
                  }}
                  sx={{
                    width: '100px',
                    '& .MuiInputBase-input': {
                      color: '#EF4444',
                      fontWeight: 'bold',
                      fontSize: '2rem',
                      textAlign: 'center',
                      padding: '4px',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#EF4444',
                      },
                      '&:hover fieldset': {
                        borderColor: '#DC2626',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#EF4444',
                      },
                    },
                  }}
                  aria-label="Work duration in seconds"
                />
                <Tooltip title="Increase by 5s" arrow>
                  <IconButton
                    color="primary"
                    onClick={() => setWorkTime((prev) => prev + 5)}
                    aria-label="Increase work duration"
                    disabled={controlsDisabled}
                    sx={stepperButtonSx}
                  >
                    <Add fontSize="large" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            <Box>
              <Typography
                sx={{
                  color: 'white',
                  fontWeight: 'medium',
                  mb: 0.5,
                  fontSize: '0.9rem',
                }}
              >
                Rest Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={1}
              >
                <Tooltip title="Decrease by 5s" arrow>
                  <IconButton
                    color="primary"
                    onClick={() => setRestTime((prev) => Math.max(0, prev - 5))}
                    aria-label="Decrease rest duration"
                    disabled={controlsDisabled}
                    sx={stepperButtonSx}
                  >
                    <Remove fontSize="large" />
                  </IconButton>
                </Tooltip>
                <TextField
                  type="number"
                  value={restTime}
                  disabled={controlsDisabled}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    const next = Math.max(0, val)
                    latestRest.current = next
                    setRestTime(next)
                  }}
                  inputProps={{
                    min: 0,
                    step: 5,
                    style: { textAlign: 'center' },
                    'data-testid': 'rest-duration-input',
                  }}
                  sx={{
                    width: '100px',
                    '& .MuiInputBase-input': {
                      color: '#22C55E',
                      fontWeight: 'bold',
                      fontSize: '2rem',
                      textAlign: 'center',
                      padding: '4px',
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#22C55E',
                      },
                      '&:hover fieldset': {
                        borderColor: '#16A34A',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#22C55E',
                      },
                    },
                  }}
                  aria-label="Rest duration in seconds"
                />
                <Tooltip title="Increase by 5s" arrow>
                  <IconButton
                    color="primary"
                    onClick={() => setRestTime((prev) => prev + 5)}
                    aria-label="Increase rest duration"
                    disabled={controlsDisabled}
                    sx={stepperButtonSx}
                  >
                    <Add fontSize="large" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Stack>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          {!timerData.isRunning ? (
            <Button
              data-testid="start-timer-button"
              variant="contained"
              color="success"
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
              color="error"
              onClick={() => sendTimerCommand('STOP')}
              disabled={connectionStatus !== 'Connected'}
              sx={stopButtonSx}
              startIcon={<Stop fontSize="large" />}
            >
              STOP
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  )
}

export default TimerControls
