import { useEffect, useRef } from 'react'
import logger from '@/utils/logger'

/** Minimal Screen Wake Lock surface (feature-detected; DOM lib varies). */
interface WakeLockSentinelLike {
  readonly released: boolean
  release(): Promise<void>
  addEventListener(type: 'release', listener: () => void): void
  removeEventListener(type: 'release', listener: () => void): void
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

/**
 * Holds a Screen Wake Lock while `active`, keeping the OS from throttling
 * the page — and its GATT stream — when the screen would otherwise sleep
 * mid-workout. Re-acquires when the tab returns to visible; always
 * releases on inactive/unmount. No-op where unsupported.
 */
export const useWakeLock = (active: boolean): void => {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') {
      return undefined
    }
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockLike })
      .wakeLock
    if (!wakeLock) return undefined

    let cancelled = false

    const onRelease = () => {
      // The OS took the lock (e.g. explicit screen lock): drop the dead
      // handle so a later acquire doesn't think it still holds one.
      // Re-acquire happens via visibilitychange on return.
      sentinelRef.current = null
      logger.debug('Screen Wake Lock released')
    }

    const release = () => {
      const sentinel = sentinelRef.current
      sentinelRef.current = null
      if (sentinel && !sentinel.released) {
        sentinel.removeEventListener('release', onRelease)
        sentinel.release().catch(() => {
          // Released by the OS first — nothing to do.
        })
      }
    }

    const acquire = async () => {
      if (!active || document.visibilityState !== 'visible') return
      if (sentinelRef.current && !sentinelRef.current.released) return
      try {
        const sentinel = await wakeLock.request('screen')
        if (cancelled || !active) {
          await sentinel.release().catch(() => {})
          return
        }
        sentinel.addEventListener('release', onRelease)
        sentinelRef.current = sentinel
        logger.debug('Screen Wake Lock acquired')
      } catch (error) {
        // Hidden tabs reject; visibilitychange retries on return.
        logger.debug({ error }, 'Screen Wake Lock request failed')
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void acquire()
      }
    }

    if (active) {
      void acquire()
    } else {
      release()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      release()
    }
  }, [active])
}
