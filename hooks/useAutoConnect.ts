<<<<<<< HEAD
// File: hooks/useAutoConnect.ts
=======
>>>>>>> origin/leader
import { useState, useEffect, useRef } from 'react'

const MAX_DELAY = 30000 // 30 seconds
const INITIAL_DELAY = 1000 // 1 second

type ConnectFn = () => Promise<boolean>

const useAutoConnect = (connectFn: ConnectFn, start: boolean) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

<<<<<<< HEAD
  const savedConnectFn = useRef(connectFn)
  useEffect(() => {
    savedConnectFn.current = connectFn
  }, [connectFn])

  useEffect(() => {
    if (!start) {
      // If not starting, do nothing. The cleanup from the previous effect
      // will handle stopping timers and resetting state.
      return
    }

    let delay = INITIAL_DELAY
    let isActive = true // Flag to prevent state updates after cleanup

    const tryConnect = async () => {
      if (!isActive) return
      setIsConnecting(true)
      setAttempts((prev) => prev + 1)

      const success = await savedConnectFn.current()

      if (!isActive) return // Don't update state if the effect has been cleaned up

      setIsConnecting(false)

      if (success) {
        setAttempts(0)
      } else {
        delay = Math.min(delay * 2, MAX_DELAY)
        timeoutRef.current = setTimeout(tryConnect, delay)
      }
=======
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
          const newDelay = Math.min(delay * 2, MAX_DELAY)
          timeoutRef.current = setTimeout(() => tryConnect(newDelay), newDelay)
        }
      }
    }

    if (start) {
      tryConnect(INITIAL_DELAY)
>>>>>>> origin/leader
    }

    tryConnect()

    // This cleanup function runs when `start` becomes false or the component unmounts.
    return () => {
<<<<<<< HEAD
      isActive = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      // Reset state when the connection process is stopped.
      setIsConnecting(false)
      setAttempts(0)
    }
  }, [start])
=======
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsConnecting(false)
      setAttempts(0)
    }
  }, [start, connectFn])
>>>>>>> origin/leader

  return { isConnecting, attempts }
}

export default useAutoConnect
