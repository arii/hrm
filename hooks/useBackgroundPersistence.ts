import { useEffect, useRef, useCallback } from 'react'
import logger from '@/utils/logger'
import { requestWakeLock } from '@/utils/wakeLock'

/**
 * useBackgroundPersistence
 * Extracts the logic for maintaining high priority execution when the tab is backgrounded.
 * Uses the Screen Wake Lock API and a looping silent audio track.
 */
export const useBackgroundPersistence = (isActive: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopPersistence = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {})
      wakeLockRef.current = null
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause()
      } catch (err) {
        logger.debug({ err }, 'Failed to pause silent audio')
      }
      audioRef.current = null
    }
  }, [])

  const startPersistence = useCallback(async () => {
    if (typeof window === 'undefined') return

    // 1. Wake Lock
    if (!wakeLockRef.current) {
      const wl = await requestWakeLock()
      if (wl) {
        wl.addEventListener('release', () => {
          wakeLockRef.current = null
        })
        wakeLockRef.current = wl
      }
    }

    // 2. Silent Audio
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/silence.mp3')
      audioRef.current.loop = true
    }

    try {
      const p = audioRef.current.play()
      if (p instanceof Promise) {
        p.catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'NotAllowedError') {
            logger.warn(
              'Silent audio keep-alive blocked by browser autoplay policy. User interaction required.'
            )
          } else {
            logger.debug({ err }, 'Silent audio play failed')
          }
        })
      }
    } catch (err) {
      logger.debug({ err }, 'Silent audio failed')
    }
  }, [])

  useEffect(() => {
    if (isActive) {
      startPersistence()
    } else {
      stopPersistence()
    }
  }, [isActive, startPersistence, stopPersistence])

  // Handle visibility change (browsers often release wake lock when hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        startPersistence()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isActive, startPersistence])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPersistence()
    }
  }, [stopPersistence])
}
