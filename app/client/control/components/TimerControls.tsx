// File: app/client/control/components/TimerControls.tsx
'use client'
import { useDebounce } from '@/hooks/useDebounce'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useWebSocket } from '@/context/WebSocketContext'
import {
  TimerCommandMessage,
  TimerConfigMessage,
  TimerModeCommandMessage,
} from '@/types/websocket'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { useCallback, useEffect, useState } from 'react'
import {
  DISCONNECTED_UI_REVERT_DELAY,
  OPTIMISTIC_ACTION_TIMEOUT,
} from '../constants'
import TimerCommandPanel from './TimerCommandPanel'
import TimerDurationConfig from './TimerDurationConfig'
import TimerModeSelector, { TimerMode } from './TimerModeSelector'

import { useTheme, alpha } from '@mui/material/styles'

const TimerControls = () => {
  const theme = useTheme()
  const { timerData, sendData, connectionStatus } = useWebSocket()
  const { execute: executeSpotify } = useSpotifyCommand()
  const [workTime, setWorkTime] = useState(20)
  const [restTime, setRestTime] = useState(10)
  const [optimisticAction, setOptimisticAction] = useState<
    'START' | 'STOP' | null
  >(null)

  const debouncedWorkTime = useDebounce(workTime, 500)
  const debouncedRestTime = useDebounce(restTime, 500)

  // When the server's timer data changes, it becomes the source of truth.
  // We clear any optimistic action to ensure the UI reflects the server state.
  useEffect(() => {
    if (optimisticAction === 'START' && timerData.isRunning === true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptimisticAction(null)
    } else if (optimisticAction === 'STOP' && timerData.isRunning === false) {
      setOptimisticAction(null)
    }
  }, [timerData.isRunning, optimisticAction])

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

      if (command === 'START') executeSpotify('NEXT')
      else if (command === 'STOP') executeSpotify('PAUSE')
    },
    [sendData, executeSpotify, connectionStatus, workTime, restTime]
  )

  const sendModeCommand = (mode: TimerMode) => {
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
          onSelectMode={sendModeCommand}
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
