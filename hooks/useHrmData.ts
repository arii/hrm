// File: hooks/useHrmData.ts
'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { HrmData } from '@/types/websocket'
import { useMemo } from 'react'

/**
 * @description A hook to extract a memoized HRM data array from the WebSocket context.
 * This hook ensures that consumers only re-render when the content of the hrmData array changes.
 * @returns {HrmData[]} The heart rate monitor data array.
 */
export const useHrmData = (): HrmData[] => {
  const { hrmData } = useWebSocket()

  // Memoize the hrmData array based on its content.
  // By using JSON.stringify, we create a stable dependency that only changes
  // when the actual data inside the array changes.
  const memoizedHrmData = useMemo(() => {
    return hrmData
  }, [JSON.stringify(hrmData)])

  return memoizedHrmData
}
