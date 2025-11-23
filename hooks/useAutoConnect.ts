// File: hooks/useAutoConnect.ts
import { useState, useEffect, useCallback, useRef } from 'react'

const MAX_DELAY = 30000 // 30 seconds
const INITIAL_DELAY = 1000 // 1 second

type ConnectFn = () => Promise<boolean>

const useAutoConnect = (connectFn: ConnectFn, start: boolean) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const delayRef = useRef(INITIAL_DELAY)
  const savedConnectFn = useRef(connectFn)

  useEffect(() => {
    savedConnectFn.current = connectFn
  }, [connectFn])

  const tryConnect = useCallback(() => {
    const connect = async () => {
      setIsConnecting(true)
      setAttempts((prev) => prev + 1)
      const success = await savedConnectFn.current()
      if (success) {
        setIsConnecting(false)
        setAttempts(0)
        delayRef.current = INITIAL_DELAY
      } else {
        const newDelay = Math.min(delayRef.current * 2, MAX_DELAY)
        delayRef.current = newDelay
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(connect, newDelay)
      }
    }
    connect()
  }, [])

  useEffect(() => {
    if (start) {
      tryConnect()
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsConnecting(false)
      setAttempts(0)
      delayRef.current = INITIAL_DELAY
    }
  }, [start, tryConnect])

  return { isConnecting, attempts }
}

export default useAutoConnect