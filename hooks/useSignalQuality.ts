import { useState, useEffect, useRef, useCallback } from 'react'

// Constants for signal quality calculation
const ROLLING_AVG_HISTORY_LENGTH = 5
const MISSED_PACKET_THRESHOLD_BUFFER_MS = 500
const MIN_MISSED_PACKET_THRESHOLD_MS = 1500
const HEARTBEAT_INTERVAL_MS = 1000

interface UseSignalQualityProps {
  lastDataTimestamp: number
  isConnected: boolean
  isDataStale: boolean
}

const useSignalQuality = ({
  lastDataTimestamp,
  isConnected,
  isDataStale,
}: UseSignalQualityProps) => {
  const [signalPeriodMs, setSignalPeriodMs] = useState<number>(0)
  const periodHistory = useRef<number[]>([])
  const avgPeriodMs = useRef<number>(0)
  const prevDataTimestampRef = useRef<number>(0)

  const updateSignalPeriod = useCallback((newPeriod: number) => {
    periodHistory.current.push(newPeriod)
    if (periodHistory.current.length > ROLLING_AVG_HISTORY_LENGTH) {
      periodHistory.current.shift()
    }
    const total = periodHistory.current.reduce((sum, val) => sum + val, 0)
    const average = total / periodHistory.current.length
    avgPeriodMs.current = average
    setSignalPeriodMs(Math.round(average))
  }, [])

  // Reset when disconnected
  useEffect(() => {
    if (!isConnected) {
      periodHistory.current = []
      avgPeriodMs.current = 0
      setSignalPeriodMs(0)
      prevDataTimestampRef.current = 0
    }
  }, [isConnected])

  // Calculate signal period based on incoming data packets
  useEffect(() => {
    if (
      isConnected &&
      lastDataTimestamp > 0 &&
      lastDataTimestamp !== prevDataTimestampRef.current
    ) {
      // Don't calculate a delta for the very first packet
      if (prevDataTimestampRef.current > 0) {
        const delta = lastDataTimestamp - prevDataTimestampRef.current
        updateSignalPeriod(delta)
      }
      prevDataTimestampRef.current = lastDataTimestamp
    }
  }, [lastDataTimestamp, isConnected, updateSignalPeriod])

  // Heartbeat for proactive signal quality assessment
  useEffect(() => {
    const heartbeat = setInterval(() => {
      if (!isConnected || isDataStale || lastDataTimestamp === 0) {
        return
      }

      const now = Date.now()
      const timeSinceLastData = now - lastDataTimestamp
      const threshold = Math.max(
        avgPeriodMs.current + MISSED_PACKET_THRESHOLD_BUFFER_MS,
        MIN_MISSED_PACKET_THRESHOLD_MS
      )

      if (timeSinceLastData > threshold) {
        updateSignalPeriod(timeSinceLastData)
      }
    }, HEARTBEAT_INTERVAL_MS)

    return () => clearInterval(heartbeat)
  }, [isConnected, isDataStale, lastDataTimestamp, updateSignalPeriod])

  return { signalPeriodMs }
}

export default useSignalQuality
