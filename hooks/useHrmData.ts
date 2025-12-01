'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { useMemo } from 'react'
import { HrmData } from '@/types/websocket'

export const useHrmData = (): HrmData[] => {
  const { hrmData } = useWebSocket()

  return useMemo(() => hrmData, [hrmData])
}
