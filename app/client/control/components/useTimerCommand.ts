// File: app/client/control/components/useTimerCommand.ts
'use client'
import { useCallback, useEffect, useState } from 'react'
import { TimerCommandMessage, TimerConfigMessage } from '@/types/websocket'
import logger from '@/utils/logger'
import {
  DISCONNECTED_UI_REVERT_DELAY,
  OPTIMISTIC_ACTION_TIMEOUT,
} from '../constants'

interface UseTimerCommandParams {
  isServerRunning: boolean
  connectionStatus: string
  workTime: number
  restTime: number
  sendData: (message: TimerCommandMessage | TimerConfigMessage) => void
  executeSpotify: (command: 'NEXT' | 'PAUSE') => void
}

/**
 * Optimistic START/STOP state machine for the workout timer.
 * Applies the command to the UI immediately, then reconciles when the
 * server confirms (or reverts on timeout / when disconnected).
 */
export const useTimerCommand = ({
  isServerRunning,
  connectionStatus,
  workTime,
  restTime,
  sendData,
  executeSpotify,
}: UseTimerCommandParams) => {
  const [optimisticAction, setOptimisticAction] = useState<
    'START' | 'STOP' | null
  >(null)

  // When the server's timer data changes, it becomes the source of truth.
  // We clear any optimistic action to ensure the UI reflects the server state.
  useEffect(() => {
    if (optimisticAction === 'START' && isServerRunning === true) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOptimisticAction(null)
    } else if (optimisticAction === 'STOP' && isServerRunning === false) {
      setOptimisticAction(null)
    }
  }, [isServerRunning, optimisticAction])

  // Safety timeout to clear the optimistic action if the server doesn't
  // confirm it within a reasonable time.
  useEffect(() => {
    if (optimisticAction) {
      const timer = setTimeout(() => {
        logger.warn(
          `[useTimerCommand] Optimistic action "${optimisticAction}" timed out. Reverting UI.`
        )
        setOptimisticAction(null)
      }, OPTIMISTIC_ACTION_TIMEOUT)
      return () => clearTimeout(timer)
    }
    return () => {}
  }, [optimisticAction])

  const sendTimerCommand = useCallback(
    (command: 'START' | 'STOP') => {
      // Optimistically update the UI
      setOptimisticAction(command)

      // If disconnected, revert the optimistic update after a short delay
      if (connectionStatus !== 'Connected') {
        logger.warn(
          `[useTimerCommand] WebSocket not connected (status: ${connectionStatus}). Failed to send "${command}" command. Reverting optimistic UI.`
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

  // Derive the running state from the server state and any optimistic action.
  const isRunning =
    optimisticAction === 'START'
      ? true
      : optimisticAction === 'STOP'
        ? false
        : isServerRunning

  return { isRunning, sendTimerCommand }
}
