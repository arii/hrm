'use client'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react'
import {
  useTimerData,
  useWebSocketConnection,
} from '@/context/WebSocketContext'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import { useTimerCommand } from '@/app/client/control/components/useTimerCommand'

interface DashboardTimerControl {
  isRunning: boolean
  canControl: boolean
  toggle: () => void
  startInterval: (workDuration: number, restDuration: number) => void
}

const DashboardTimerControlContext =
  createContext<DashboardTimerControl | null>(null)

/** Null outside the provider, so dashboard pieces render display-only. */
export const useDashboardTimerControl = (): DashboardTimerControl | null =>
  useContext(DashboardTimerControlContext)

export const DashboardTimerControlProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const timerData = useTimerData()
  const { sendData, connectionStatus } = useWebSocketConnection()
  const { execute: executeSpotify } = useSpotifyCommand()
  const { isRunning, sendTimerCommand } = useTimerCommand({
    isServerRunning: timerData.isRunning,
    connectionStatus,
    workTime: timerData.workDuration ?? 20,
    restTime: timerData.restDuration ?? 10,
    sendData,
    executeSpotify,
  })
  const canControl = connectionStatus === 'Connected'

  const toggle = useCallback(
    () => sendTimerCommand(isRunning ? 'STOP' : 'START'),
    [isRunning, sendTimerCommand]
  )

  const startInterval = useCallback(
    (workDuration: number, restDuration: number) => {
      if (!canControl) return
      sendData({ type: 'SET_MODE', mode: 'TABATA' })
      sendData({ type: 'TIMER_CONFIG', workDuration, restDuration })
      sendData({ type: 'TIMER_COMMAND', command: 'START' })
      executeSpotify('NEXT')
    },
    [canControl, sendData, executeSpotify]
  )

  const value = useMemo(
    () => ({ isRunning, canControl, toggle, startInterval }),
    [isRunning, canControl, toggle, startInterval]
  )

  return (
    <DashboardTimerControlContext.Provider value={value}>
      {children}
    </DashboardTimerControlContext.Provider>
  )
}
