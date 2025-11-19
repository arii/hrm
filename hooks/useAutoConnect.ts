// File: hooks/useAutoConnect.ts
import { useState, useEffect, useCallback, useRef } from 'react'

const MAX_DELAY = 30000 // 30 seconds
const INITIAL_DELAY = 1000 // 1 second

type ConnectFn = () => Promise<boolean>

const useAutoConnect = (connectFn: ConnectFn, start: boolean) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [delay, setDelay] = useState(INITIAL_DELAY)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const tryConnect = useCallback(async () => {
    setIsConnecting(true)
    setAttempts((prev) => prev + 1)

    const success = await connectFn()

    if (success) {
      setIsConnecting(false)
      // Reset attempts and delay on success
      setAttempts(0)
      setDelay(INITIAL_DELAY)
    } else {
      // Exponential backoff
      const newDelay = Math.min(delay * 2, MAX_DELAY)
      setDelay(newDelay)

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(tryConnect, newDelay)
    }
  }, [connectFn, delay])

  useEffect(() => {
    if (start) {
      // Start the connection process
      tryConnect()
    } else {
      // Stop and reset everything if start becomes false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsConnecting(false)
      setAttempts(0)
      setDelay(INITIAL_DELAY)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [start, tryConnect])

  return { isConnecting, attempts }
}

export default useAutoConnect
