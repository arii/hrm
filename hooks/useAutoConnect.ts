import { useState, useEffect, useRef } from 'react'

const MAX_DELAY_DEFAULT = 30000 // 30 seconds
const INITIAL_DELAY_DEFAULT = 1000 // 1 second

type ConnectFn = () => Promise<boolean>
type StatusCallback = (isConnecting: boolean, attempts: number) => void

interface AutoConnectOptions {
  initialDelay?: number
  maxDelay?: number
}

const useAutoConnect = (
  connectFn: ConnectFn,
  start: boolean,
  onStatusChange: StatusCallback,
  options: AutoConnectOptions = {}
) => {
  const {
    initialDelay = INITIAL_DELAY_DEFAULT,
    maxDelay = MAX_DELAY_DEFAULT,
  } = options
  const [isConnecting, setIsConnecting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    onStatusChange(isConnecting, attempts)
  }, [isConnecting, attempts, onStatusChange])

  useEffect(() => {
    let isMounted = true
    const tryConnect = async (delay: number) => {
      if (!start || !isMounted) {
        return
      }

      setIsConnecting(true)
      setAttempts((prev) => prev + 1)

      const success = await connectFn()

      if (isMounted) {
        if (success) {
          setIsConnecting(false)
          setAttempts(0)
        } else {
          const newDelay = Math.min(delay * 2, maxDelay)
          timeoutRef.current = setTimeout(() => tryConnect(newDelay), newDelay)
        }
      }
    }

    if (start) {
      tryConnect(initialDelay)
    }

    return () => {
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsConnecting(false)
      setAttempts(0)
    }
  }, [start, connectFn, initialDelay, maxDelay])

  return { isConnecting, attempts }
}

export default useAutoConnect
