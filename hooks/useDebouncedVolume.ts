// hooks/useDebouncedVolume.ts
import { useEffect } from 'react'
import { useDebounce } from './useDebounce'

const STORAGE_KEY_VOL = 'hrm-preferred-volume'

/**
 * A hook that debounces the volume value and persists it to localStorage.
 * @param {number} volume - The current volume level (0-100).
 * @param {boolean} isLoaded - A flag to indicate if the initial volume has been loaded from localStorage.
 */
const useDebouncedVolume = (volume: number, isLoaded: boolean) => {
  const debouncedVolume = useDebounce(volume, 500) // 500ms debounce delay

  useEffect(() => {
    if (isLoaded) {
      try {
        window.localStorage.setItem(STORAGE_KEY_VOL, String(debouncedVolume))
      } catch (error) {
        console.warn('Could not persist volume preference:', error)
      }
    }
  }, [debouncedVolume, isLoaded])
}

export default useDebouncedVolume
