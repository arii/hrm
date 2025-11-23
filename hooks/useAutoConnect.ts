import { useState, useEffect, useRef } from 'react'

const MAX_DELAY = 30000 // 30 seconds
const INITIAL_DELAY = 1000 // 1 second

type ConnectFn = () => Promise<boolean>

const useAutoConnect = (connectFn: ConnectFn, start: boolean) => {
  const [isConnecting, setIsConnecting] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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
    }

    return () => {
      isMounted = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsConnecting(false)
      setAttempts(0)
    }
  }, [start, connectFn])

  return { isConnecting, attempts }
}

export default useAutoConnect
