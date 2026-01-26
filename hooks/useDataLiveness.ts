import { useState, useEffect, useRef } from 'react'

interface UseDataLivenessProps {
  lastDataTimestamp: number
  isConnected: boolean
  dataLivenessTimeoutMs?: number
  onStale: () => void
}

const useDataLiveness = ({
  lastDataTimestamp,
  isConnected,
  dataLivenessTimeoutMs = 10000,
  onStale,
}: UseDataLivenessProps) => {
  const [isDataStale, setIsDataStale] = useState(false)
  const onStaleRef = useRef(onStale)

  useEffect(() => {
    onStaleRef.current = onStale
  }, [onStale])

  useEffect(() => {
    if (!isConnected) {
      setIsDataStale(false)
    }
  }, [isConnected])

  useEffect(() => {
    if (!dataLivenessTimeoutMs || !isConnected) {
      return
    }

    const interval = setInterval(() => {
      if (lastDataTimestamp > 0) {
        const timeSinceLastData = Date.now() - lastDataTimestamp

        const shouldBeStale = timeSinceLastData > dataLivenessTimeoutMs

        if (shouldBeStale && !isDataStale) {
          setIsDataStale(true)
          onStaleRef.current?.()
        } else if (!shouldBeStale && isDataStale) {
          setIsDataStale(false)
        }
      }
    }, 2000) // Check every 2s

    return () => clearInterval(interval)
  }, [dataLivenessTimeoutMs, isConnected, lastDataTimestamp, isDataStale])

  return { isDataStale }
}

export default useDataLiveness
