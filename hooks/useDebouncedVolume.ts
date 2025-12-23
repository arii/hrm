import { useEffect, useRef } from 'react'
import { STORAGE_KEY_VOL } from '@/constants/storageKeys'

const DEBOUNCE_DELAY = 500 // 500ms

/**
 * Persists the volume to localStorage after a delay.
 * @param {number} volume - The volume to persist.
 * @param {boolean} isLoaded - Only persist after initial state is loaded.
 */
const useDebouncedVolume = (volume: number, isLoaded: boolean) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      try {
        if (volume > 0) {
          window.localStorage.setItem(STORAGE_KEY_VOL, String(volume))
        }
      } catch (error) {
        console.warn('Could not persist volume preference:', error)
      }
    }, DEBOUNCE_DELAY)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [volume, isLoaded])
}

export default useDebouncedVolume
