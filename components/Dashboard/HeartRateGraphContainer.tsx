// File: components/Dashboard/HeartRateGraphContainer.tsx
'use client'
import { useState, useEffect } from 'react'
import HeartRateGraph from './HeartRateGraph'
import { useWebSocket } from '@/context/WebSocketContext'
import { HeartRateDataPoint } from '@/types'

const GRAPH_TIME_WINDOW_MS = 60000 // 60 seconds

const HeartRateGraphContainer = () => {
  const [heartRateHistory, setHeartRateHistory] = useState<HeartRateDataPoint[]>([])
  const { hrmData } = useWebSocket()
  const currentUserData = hrmData.find(
    (user) => user.name?.includes('Bluetooth HRM')
  )

  useEffect(() => {
    if (currentUserData) {
      const now = Date.now()
      const newDataPoint = {
        timestamp: now,
        value: currentUserData.value,
      }
      setHeartRateHistory((prevHistory) => {
        const newHistory = [...prevHistory, newDataPoint]
        while (
          newHistory.length > 0 &&
          newHistory[0]!.timestamp < now - GRAPH_TIME_WINDOW_MS
        ) {
          newHistory.shift()
        }
        return newHistory
      })
    }
  }, [currentUserData])

  return <HeartRateGraph data={heartRateHistory} />
}

export default HeartRateGraphContainer
