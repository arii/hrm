import { useState, useEffect, useMemo, useRef } from 'react'
import { HrmData } from '../types/websocket'
import { HEART_RATE_HISTORY_SIZE } from '@/utils/constants'

export const useHeartRateMetrics = (clientId: string, hrmData: HrmData[]) => {
  const [heartRateHistory, setHeartRateHistory] = useState<number[]>([])
  const clientIdRef = useRef(clientId)
  const hrmDataRef = useRef(hrmData)

  useEffect(() => {
    clientIdRef.current = clientId
    hrmDataRef.current = hrmData
  }, [clientId, hrmData])

  useEffect(() => {
    const userHrmData = hrmDataRef.current.find(
      (user) => user.clientId === clientIdRef.current
    )
    if (userHrmData && userHrmData.value !== null) {
      const newHeartRate = userHrmData.value
      setHeartRateHistory((prevHistory) => {
        const newHistory = [...prevHistory, newHeartRate]
        if (newHistory.length > HEART_RATE_HISTORY_SIZE) {
          return newHistory.slice(newHistory.length - HEART_RATE_HISTORY_SIZE)
        }
        return newHistory
      })
    }
  }, [hrmData])

  const userHrmData = hrmData.find((user) => user.clientId === clientId)
  const currentHeartRate = userHrmData?.value ?? null

  const { averageHeartRate, maxHeartRate } = useMemo(() => {
    if (heartRateHistory.length > 0) {
      const sum = heartRateHistory.reduce((a, b) => a + b, 0)
      const average = Math.round(sum / heartRateHistory.length)
      const max = Math.max(...heartRateHistory)
      return { averageHeartRate: average, maxHeartRate: max }
    }
    return { averageHeartRate: 0, maxHeartRate: 0 }
  }, [heartRateHistory])

  return { currentHeartRate, averageHeartRate, maxHeartRate }
}
