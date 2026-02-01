// File: hooks/useLocalWorkoutBuffer.ts
import { useState, useEffect, useRef } from 'react'
import { HrmData } from '@/types/websocket'
import { calculateTimeInZone } from '@/utils/hr'

const MAX_BUFFER_SIZE = 300 // Maximum number of HR values to store (e.g., 5 minutes of data at 1s interval)

export const useLocalWorkoutBuffer = (userData: HrmData) => {
  const [hrHistory, setHrHistory] = useState<
    { timestamp: number; value: number }[]
  >([])
  const [timeInZone, setTimeInZone] = useState<Record<string, number>>({})
  const lastUpdateTime = useRef<number>(Date.now())

  useEffect(() => {
    if (userData && userData.value !== null) {
      const now = Date.now()

      // Add new data to history, maintaining buffer size
      setHrHistory((prevHistory) => {
        const newEntry = { timestamp: now, value: userData.value }
        const updatedHistory = [...prevHistory, newEntry]
        return updatedHistory.length > MAX_BUFFER_SIZE
          ? updatedHistory.slice(updatedHistory.length - MAX_BUFFER_SIZE)
          : updatedHistory
      })

      // Update time in zone
      const elapsedTime = (now - lastUpdateTime.current) / 1000 // in seconds
      lastUpdateTime.current = now

      setTimeInZone((prevTimeInZone) => {
        return calculateTimeInZone(
          prevTimeInZone,
          userData.value,
          userData.maxHr,
          elapsedTime
        )
      })
    }
  }, [userData])

  return { hrHistory, timeInZone }
}
