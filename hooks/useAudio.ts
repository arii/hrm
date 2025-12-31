import { useEffect, useRef } from 'react'

export const useAudio = () => {
  const timerData = {
    soundToPlay: null,
    soundEventId: 0,
  }
  const lastSoundEventId = useRef<number>(0)

  useEffect(() => {
    //
  }, [timerData.soundToPlay, timerData.soundEventId])

  // Initialize audio on first user interaction
  const initializeAudio = () => {
    //
  }

  return {
    initializeAudio,
  }
}
