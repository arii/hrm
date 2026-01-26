/**
 * @file useDataLiveness.ts
 * @description A React hook that monitors a data stream and flags it as stale if no new data is received within a specified timeout.
 */
import { useState, useEffect, useRef } from 'react'

interface UseDataLivenessProps {
  /**
   * @property {number} lastDataTimestamp - The timestamp of the last received data packet. Should be 0 if no data has been received yet.
   */
  lastDataTimestamp: number
  /**
   * @property {number} timeoutMs - The timeout in milliseconds. If the time since `lastDataTimestamp` exceeds this value, the stream is considered stale. A value of 0 disables the hook.
   */
  timeoutMs: number
  /**
   * @property {() => void} [onStale] - An optional callback to execute when the data stream becomes stale.
   */
  onStale?: () => void
  /**
   * @property {() => void} [onFresh] - An optional callback to execute when a stale data stream becomes fresh again.
   */
  onFresh?: () => void
  /**
   * @property {number} [checkIntervalMs=2000] - The interval in milliseconds at which to check for data staleness.
   */
  checkIntervalMs?: number
  /**
   * @property {boolean} [isEnabled=true] - A flag to enable or disable the liveness check.
   */
  isEnabled?: boolean
}

export const useDataLiveness = ({
  lastDataTimestamp,
  timeoutMs,
  onStale,
  onFresh,
  checkIntervalMs = 2000,
  isEnabled = true,
}: UseDataLivenessProps) => {
  const [isDataStale, setIsDataStale] = useState(false)
  const onStaleRef = useRef(onStale)
  const onFreshRef = useRef(onFresh)

  useEffect(() => {
    onStaleRef.current = onStale
  }, [onStale])

  useEffect(() => {
    onFreshRef.current = onFresh
  }, [onFresh])

  useEffect(() => {
    if (!isEnabled || timeoutMs <= 0) {
      if (isDataStale) setIsDataStale(false)
      return
    }

    const interval = setInterval(() => {
      if (lastDataTimestamp > 0) {
        const timeSinceLastData = Date.now() - lastDataTimestamp

        if (timeSinceLastData > timeoutMs) {
          if (!isDataStale) {
            setIsDataStale(true)
            onStaleRef.current?.()
          }
        } else {
          if (isDataStale) {
            setIsDataStale(false)
            onFreshRef.current?.()
          }
        }
      }
    }, checkIntervalMs)

    return () => clearInterval(interval)
  }, [isEnabled, lastDataTimestamp, timeoutMs, checkIntervalMs, isDataStale])

  return { isDataStale }
}
