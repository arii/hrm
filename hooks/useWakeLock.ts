// File: hooks/useWakeLock.ts
import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * A hook to manage the Screen Wake Lock API.
 * Provides functions to request and release the lock, and reports its status.
 * The component using this hook is responsible for the logic of when to request/release.
 */
const useWakeLock = () => {
  const [isSupported, setIsSupported] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    setIsSupported('wakeLock' in navigator)
  }, [])

  const request = useCallback(async () => {
    if (!isSupported || wakeLockRef.current) return
    try {
      const lock = await navigator.wakeLock.request('screen')
      wakeLockRef.current = lock
      setIsActive(true)

      // Listen for the lock being released by the system
      lock.addEventListener('release', () => {
        wakeLockRef.current = null
        setIsActive(false)
      })
    } catch (err: any) {
      console.error(`Wake Lock failed: ${err.name}, ${err.message}`)
    }
  }, [isSupported])

  const release = useCallback(async () => {
    if (!wakeLockRef.current) return
    try {
      await wakeLockRef.current.release()
      wakeLockRef.current = null
      setIsActive(false)
    } catch (err: any) {
      console.error(`Wake Lock release failed: ${err.name}, ${err.message}`)
    }
  }, [])

  return { request, release, isActive, isSupported }
}

export default useWakeLock
