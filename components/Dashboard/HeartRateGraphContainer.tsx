// File: components/Dashboard/HeartRateGraphContainer.tsx
'use client'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import HeartRateGraph from './HeartRateGraph'
import { useWebSocket } from '@/context/WebSocketContext'
import { HeartRateDataPoint } from '@/types'
import throttle from 'lodash.throttle'

const GRAPH_TIME_WINDOW_MS = 60000 // 60 seconds
const RENDER_THROTTLE_MS = 1000 // 1 second

const HeartRateGraphContainer = () => {
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateDataPoint[]>([])
  const { hrmData } = useWebSocket()
  const dataQueueRef = useRef<HeartRateDataPoint[]>([])

  const currentUserData = useMemo(
    () => hrmData.find((user) => user.name?.includes('Bluetooth HRM')),
    [hrmData]
  )

  const flushQueue = useCallback(() => {
    setHeartRateHistory((prevHistory) => {
      const now = Date.now()
      const combined = [...prevHistory, ...dataQueueRef.current]
      dataQueueRef.current = [] // Clear the queue

      // Efficiently filter out old data points
      while (
        combined.length > 0 &&
        combined[0]!.timestamp < now - GRAPH_TIME_WINDOW_MS
      ) {
        combined.shift()
      }
      return combined
    })
  }, [])

  const throttledFlush = useMemo(
    () => throttle(flushQueue, RENDER_THROTTLE_MS),
    [flushQueue]
  )

  useEffect(() => {
    if (currentUserData && typeof currentUserData.value === 'number') {
      dataQueueRef.current.push({
        timestamp: Date.now(),
        value: currentUserData.value,
      })
      throttledFlush()
    }
  }, [currentUserData, throttledFlush])

  return <HeartRateGraph data={heartRateHistory} />
}

export default HeartRateGraphContainer
