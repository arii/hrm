// File: app/client/control/components/TimerControls.tsx
'use client'
import { useDebounce } from '@/hooks/useDebounce'
import { useWebSocket } from '@/context/WebSocketContext'
import logger from '@/utils/logger'
import {
  SpotifyCommandMessage,
  TimerCommandMessage,
  TimerConfigMessage,
  TimerModeCommandMessage,
} from '@/types/websocket'
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
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useRef, useState } from 'react'

const actionButtonSx = {
  flex: 1,
  fontWeight: 'bold',
  py: 1.5,
  minHeight: '64px',
  transition: 'transform 0.1s ease-in-out',
  '&:active': {
    transform: 'scale(0.95)',
  },
}

const stepperButtonSx = {
  backgroundColor: 'grey.700',
  color: 'white',
  '&:hover': { backgroundColor: 'grey.600' },
  width: 56,
  height: 56,
}

const shineAnimationSx = {
  position: 'relative',
  overflow: 'hidden',
  '&:hover': {
    '&::after': {
      animation: 'shine 0.75s forwards',
    },
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    top: '-50%',
    left: '-50%',
    width: '200%',
    height: '200%',
    background:
      'linear-gradient(120deg, rgba(255,255,255,0) 20%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 80%)',
    transform: 'translateX(-100%)',
  },
  '@keyframes shine': {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
}

const TimerControls = () => {
  const { timerData, sendData } = useWebSocket()
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
        const response = await fetch('/api/spotify/devices')
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
        deviceId = activeDevice ? activeDevice.id : (firstDevice?.id || null)
        if (deviceId) {
          setSpotifyDeviceId(deviceId)
        }
      }
      if (!deviceId) {
        logger.warn('No deviceId available, Spotify command not sent.')
        return
      }
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId,
      }
      sendData(message)
    },
    [sendData, spotifyDeviceId, spotifyDevices]
  )

  const sendTimerCommand = useCallback(
    (command: 'START' | 'PAUSE' | 'STOP') => {
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
    [sendData, latestWork, latestRest, sendSpotifyCommand]
  )

  const sendModeCommand = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'TABATA' | 'STOPWATCH' | null
  ) => {
    if (newMode) {
      const message: TimerModeCommandMessage = { type: 'SET_MODE', mode: newMode }
      sendData(message)
    }
  }

  return (
    <Card
      sx={{
        boxShadow: 6,
        mb: 2,
        backgroundColor: '#000000',
        color: '#EF4444',
        position: 'sticky',
        top: 16,
        zIndex: 1000,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography
            sx={{
              color: 'white',
              fontWeight: 'medium',
              mb: 2,
              textAlign: 'center',
            }}
          >
            Timer Mode
          </Typography>
          <ToggleButtonGroup
            value={timerData.mode}
            exclusive
            onChange={sendModeCommand}
            aria-label="Timer Mode"
            disabled={timerData.isRunning}
            sx={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              width: '100%',
              '& .MuiToggleButtonGroup-grouped': {
                flex: 1,
                border: 0,
                color: 'rgba(255, 255, 255, 0.7)',
                textTransform: 'none',
                fontSize: '1rem',
                padding: '10px 0',
                transition: 'background 0.3s ease, color 0.3s ease',
                '&:not(:first-of-type)': {
                  borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                },
                '&.Mui-selected': {
                  background:
                    'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(220, 38, 38, 0.9) 100%)',
                  color: 'white',
                  fontWeight: 'bold',
                  boxShadow:
                    'inset 0 1px 2px rgba(0,0,0,0.5), 0 0 15px rgba(239, 68, 68, 0.5)',
                },
                '&.Mui-disabled': {
                  color: 'rgba(255, 255, 255, 0.3)',
                },
              },
            }}
          >
            <ToggleButton value="TABATA" aria-label="tabata">
              <FitnessCenter sx={{ mr: 1 }} />
              Tabata
            </ToggleButton>
            <ToggleButton value="STOPWATCH" aria-label="stopwatch">
              <Timer sx={{ mr: 1 }} />
              Stopwatch
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            {timerData.isRunning ? 'Timer Running' : 'Timer Stopped'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#EF4444' }}>
            {timerData.currentPhase}
          </Typography>
        </Box>

        {timerData.mode === 'TABATA' && (
          <Stack spacing={2} sx={{ mb: 2 }}>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 'medium', mb: 1 }}>
                Timer Presets
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setWorkTime(20)
                    setRestTime(10)
                  }}
                  sx={{
                    flex: 1,
                    color: '#EF4444',
                    borderColor: '#EF4444',
                    ...shineAnimationSx,
                    '&:hover': {
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      borderColor: '#DC2626',
                      ...shineAnimationSx['&:hover'],
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
                  sx={{
                    flex: 1,
                    color: '#22C55E',
                    borderColor: '#22C55E',
                    ...shineAnimationSx,
                    '&:hover': {
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      borderColor: '#16A34A',
                      ...shineAnimationSx['&:hover'],
                    },
                  }}
                >
                  EMOM (60/60)
                </Button>
              </Stack>
              <Typography sx={{ color: 'white', fontWeight: 'medium', mb: 2 }}>
                {' '}
                Work Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={2}
              >
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease work duration"
                  sx={stepperButtonSx}
                >
                  <Remove fontSize="large" />
                </IconButton>
                <Box sx={{ position: 'relative', width: '120px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(244, 63, 94, 0.3) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    zIndex: 0,
                  }} />
                  <TextField
                    type="number"
                    value={workTime}
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
                      width: '120px',
                      position: 'relative',
                      zIndex: 1,
                      '& .MuiInputBase-input': {
                        color: '#EF4444',
                        fontWeight: 'bold',
                        fontSize: '3rem',
                        textAlign: 'center',
                        padding: 0,
                        backgroundColor: 'transparent',
                      },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'transparent',
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' },
                      },
                    }}
                    aria-label="Work duration in seconds"
                  />
                </Box>
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => prev + 5)}
                  aria-label="Increase work duration"
                  sx={stepperButtonSx}
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>

            <Box>
              <Typography sx={{ color: 'white', fontWeight: 'medium', mb: 2 }}>
                Rest Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={2}
              >
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease rest duration"
                  sx={stepperButtonSx}
                >
                  <Remove fontSize="large" />
                </IconButton>
                <Box sx={{ position: 'relative', width: '120px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box sx={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    background: 'radial-gradient(circle, rgba(34, 197, 94, 0.3) 0%, transparent 70%)',
                    filter: 'blur(20px)',
                    zIndex: 0,
                  }} />
                  <TextField
                    type="number"
                    value={restTime}
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
                      width: '120px',
                      position: 'relative',
                      zIndex: 1,
                      '& .MuiInputBase-input': {
                        color: '#22C55E',
                        fontWeight: 'bold',
                        fontSize: '3rem',
                        textAlign: 'center',
                        padding: 0,
                        backgroundColor: 'transparent',
                      },
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'transparent',
                        '& fieldset': { border: 'none' },
                        '&:hover fieldset': { border: 'none' },
                        '&.Mui-focused fieldset': { border: 'none' },
                      },
                    }}
                    aria-label="Rest duration in seconds"
                  />
                </Box>
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => prev + 5)}
                  aria-label="Increase rest duration"
                  sx={stepperButtonSx}
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        )}

        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
          {!timerData.isRunning ? (
            <Button
              variant="contained"
              color="success"
              onClick={() => sendTimerCommand('START')}
              sx={actionButtonSx}
              startIcon={<PlayArrow fontSize="large" />}
            >
              START
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={() => sendTimerCommand('STOP')}
              sx={actionButtonSx}
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
