// File: hooks/useHrmDataHistory.ts
import { useState, useEffect, useRef } from 'react'
import { HrmData } from '@/context/WebSocketContext'

const MAX_HISTORY_LENGTH = 100 // Keep the last 100 data points

export const useHrmDataHistory = (hrmData: HrmData[]) => {
  const [history, setHistory] = useState<{
    [clientId: string]: { value: number; timestamp: number }[]
  }>({})
  const lastDataRef = useRef<HrmData[]>(hrmData)

  useEffect(() => {
    if (hrmData !== lastDataRef.current) {
      const now = Date.now()
      const newEntries = hrmData.filter((d) => d.value > 0)

      if (newEntries.length > 0) {
        setHistory((prevHistory) => {
          const updatedHistory = { ...prevHistory }
          newEntries.forEach((entry) => {
            if (!updatedHistory[entry.clientId]) {
              updatedHistory[entry.clientId] = []
            }
            updatedHistory[entry.clientId].push({
              value: entry.value,
              timestamp: now,
            })
            if (updatedHistory[entry.clientId].length > MAX_HISTORY_LENGTH) {
              updatedHistory[entry.clientId].shift()
            }
          })
          return updatedHistory
        })
      }
      lastDataRef.current = hrmData
    }
  }, [hrmData])

  return history
}
