// File: app/client/control/components/TimerControls.tsx
'use client'
import { useDebounce } from '@/hooks/useDebounce'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { TimerConfigMessage, TimerModeCommandMessage } from '@/types/websocket'
import { TimerMode } from '@/types/core'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useEffect, useState } from 'react'
import TimerModeSelector from './TimerModeSelector'
import TimerCommandPanel from './TimerCommandPanel'
import TimerDurationConfig from './TimerDurationConfig'
import { useTimerCommand } from './useTimerCommand'

import { useTheme, alpha } from '@mui/material/styles'

const TimerControls = () => {
  const theme = useTheme()
  const timerData = useTimerData()
  const { sendData, connectionStatus } = useWebSocketConnection()
  const { execute: executeSpotify } = useSpotifyCommand()
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)

  const debouncedWorkTime = useDebounce(workTime, 500)
  const debouncedRestTime = useDebounce(restTime, 500)

  const { isRunning, sendTimerCommand } = useTimerCommand({
    isServerRunning: timerData.isRunning,
    connectionStatus,
    workTime,
    restTime,
    sendData,
    executeSpotify,
  })

  useEffect(() => {
    if (connectionStatus !== 'Connected') return

    const message: TimerConfigMessage = {
      type: 'TIMER_CONFIG',
      workDuration: debouncedWorkTime,
      restDuration: debouncedRestTime,
    }
    sendData(message)
  }, [debouncedWorkTime, debouncedRestTime, sendData, connectionStatus])

  const sendModeCommand = (mode: TimerMode) => {
    if (connectionStatus !== 'Connected') return
    const message: TimerModeCommandMessage = { type: 'SET_MODE', mode }
    sendData(message)
  }

  const controlsDisabled = isRunning || connectionStatus !== 'Connected'

  return (
    <Card
      data-testid="timer-controls"
      sx={{
        mb: 0,
        position: 'sticky',
        top: 8,
        zIndex: 1000,
        background: alpha(theme.palette.grey[800], 0.7),
        backdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
        borderRadius: 3,
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.4)}`,
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <TimerModeSelector
          mode={timerData.mode}
          disabled={controlsDisabled}
          onSelect={sendModeCommand}
        />

        <Box sx={{ textAlign: 'center', mb: 1.5 }}>
          <Typography
            variant="h6"
            sx={{ color: 'common.white', mb: 0.5 }}
            data-testid={isRunning ? 'timer-running' : 'timer-stopped'}
          >
            {isRunning ? 'Timer Running' : 'Timer Stopped'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'error.main' }}>
            {timerData.currentPhase}
          </Typography>
        </Box>

        {timerData.mode === 'TABATA' && (
          <TimerDurationConfig
            workTime={workTime}
            restTime={restTime}
            onWorkChange={setWorkTime}
            onRestChange={setRestTime}
            disabled={controlsDisabled}
          />
        )}

        <TimerCommandPanel
          isRunning={isRunning}
          disabled={connectionStatus !== 'Connected'}
          onStart={() => sendTimerCommand('START')}
          onStop={() => sendTimerCommand('STOP')}
        />
      </CardContent>
    </Card>
  )
}

export default TimerControls
