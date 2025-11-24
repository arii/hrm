// File: app/client/control/components/TimerControls.tsx
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { SpotifyCommandMessage } from '@/types/websocket'
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
import Typography from '@mui/material/Typography'
import { useCallback } from 'react'
import { useTimerControls } from '@/hooks/useTimerControls'
import { useSpotifyDevices } from '@/hooks/useSpotifyDevices'

const TimerControls = () => {
  const { sendData, spotifyData } = useWebSocket()
  const {
    timerData,
    workTime,
    setWorkTime,
    restTime,
    setRestTime,
    latestWork,
    latestRest,
    sendTimerCommand: sendTimerCommandInternal,
    sendModeCommand,
  } = useTimerControls()

  const hasSpotifyData =
    spotifyData.trackName !== 'Awaiting Login...' &&
    spotifyData.trackName !== '' &&
    spotifyData.trackName !== 'No Track Playing'
  const { resolveTargetDeviceId } = useSpotifyDevices(hasSpotifyData)

  const sendSpotifyCommand = useCallback(
    (command: 'NEXT' | 'PAUSE') => {
      const deviceId = resolveTargetDeviceId()
      if (!deviceId) {
        console.warn('No deviceId available, Spotify command not sent.')
        return
      }
      const message: SpotifyCommandMessage = {
        type: 'SPOTIFY_COMMAND',
        command,
        deviceId,
      }
      sendData(message)
    },
    [sendData, resolveTargetDeviceId]
  )

  const sendTimerCommand = useCallback(
    (command: 'START' | 'PAUSE' | 'STOP') => {
      sendTimerCommandInternal(command)
      if (command === 'START') {
        sendSpotifyCommand('NEXT')
      } else if (command === 'STOP') {
        sendSpotifyCommand('PAUSE')
      }
    },
    [sendTimerCommandInternal, sendSpotifyCommand]
  )

  return (
    <Card
      sx={{
        boxShadow: 6,
        mb: 3,
        backgroundColor: '#000000',
        color: '#EF4444',
        position: 'sticky',
        top: 16,
        zIndex: 1000,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              color: 'white',
              fontWeight: 'medium',
              mb: 1.5,
              textAlign: 'center',
            }}
          >
            Timer Mode
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant={timerData.mode === 'TABATA' ? 'contained' : 'outlined'}
              onClick={() => sendModeCommand('TABATA')}
              disabled={timerData.isRunning}
              startIcon={<FitnessCenter />}
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
              disabled={timerData.isRunning}
              startIcon={<Timer />}
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

        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
            {timerData.isRunning ? 'Timer Running' : 'Timer Stopped'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#EF4444' }}>
            {timerData.currentPhase}
          </Typography>
        </Box>

        {timerData.mode === 'TABATA' && (
          <Stack spacing={4} sx={{ mb: 4 }}>
            <Box>
              <Typography sx={{ color: 'white', fontWeight: 'medium', mb: 2 }}>
                {' '}
                Work Duration (seconds)
              </Typography>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="center"
                spacing={3}
              >
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => Math.max(5, prev - 5))}
                  aria-label="Decrease work duration"
                  sx={{
                    backgroundColor: 'grey.700',
                    color: 'white',
                    '&:hover': { backgroundColor: 'grey.600' },
                    p: 2,
                  }}
                >
                  <Remove fontSize="large" />
                </IconButton>
                <TextField
                  type="number"
                  value={workTime}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    const next = Math.max(5, val)
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
                    '& .MuiInputBase-input': {
                      color: '#EF4444',
                      fontWeight: 'bold',
                      fontSize: '3rem',
                      textAlign: 'center',
                      padding: '8px',
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
                <IconButton
                  color="primary"
                  onClick={() => setWorkTime((prev) => prev + 5)}
                  aria-label="Increase work duration"
                  sx={{
                    backgroundColor: 'grey.700',
                    color: 'white',
                    '&:hover': { backgroundColor: 'grey.600' },
                    p: 2,
                  }}
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
                spacing={3}
              >
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => Math.max(0, prev - 5))}
                  aria-label="Decrease rest duration"
                  sx={{
                    backgroundColor: 'grey.700',
                    color: 'white',
                    '&:hover': { backgroundColor: 'grey.600' },
                    p: 2,
                  }}
                >
                  <Remove fontSize="large" />
                </IconButton>
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
                    '& .MuiInputBase-input': {
                      color: '#22C55E',
                      fontWeight: 'bold',
                      fontSize: '3rem',
                      textAlign: 'center',
                      padding: '8px',
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
                <IconButton
                  color="primary"
                  onClick={() => setRestTime((prev) => prev + 5)}
                  aria-label="Increase rest duration"
                  sx={{
                    backgroundColor: 'grey.700',
                    color: 'white',
                    '&:hover': { backgroundColor: 'grey.600' },
                    p: 2,
                  }}
                >
                  <Add fontSize="large" />
                </IconButton>
              </Stack>
            </Box>
          </Stack>
        )}

        <Stack direction="row" spacing={3} sx={{ mt: 4 }}>
          {!timerData.isRunning ? (
            <Button
              variant="contained"
              color="success"
              onClick={() => sendTimerCommand('START')}
              sx={{ flex: 1, fontWeight: 'bold', py: 1.5 }}
              startIcon={<PlayArrow fontSize="large" />}
            >
              START
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              onClick={() => sendTimerCommand('STOP')}
              sx={{ flex: 1, fontWeight: 'bold', py: 1.5 }}
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
