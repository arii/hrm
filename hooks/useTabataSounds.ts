// File: hooks/useTabataSounds.ts
// Plays Tabata cues by reusing the original HRM audio assets. The cues still
// respect the shared volume preference and we debounce duplicate events.

import { useEffect, useRef } from 'react'
import { volumeToScalar } from './useVolume'

type TabataCue = 'WORK' | 'REST' | 'COUNTDOWN'
type AudioKey = 'LONG' | 'SHORT'

const TABATA_AUDIO_SOURCES: Record<AudioKey, string> = {
  LONG: '/assets/beep-01a.wav',
  SHORT: '/assets/beep-07.wav',
}

interface TimedCue {
  audio: AudioKey
  delay: number // ms from sequence start
}

const TIMELINES: Record<TabataCue, TimedCue[]> = {
  WORK: [
    { audio: 'SHORT', delay: 0 },
    { audio: 'SHORT', delay: 220 },
  ],
  REST: [{ audio: 'LONG', delay: 0 }],
  COUNTDOWN: [
    { audio: 'SHORT', delay: 0 },
    { audio: 'SHORT', delay: 180 },
    { audio: 'SHORT', delay: 360 },
  ],
}

const createAudioElement = (src: string): HTMLAudioElement => {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.crossOrigin = 'anonymous'
  return audio
}

const useTabataSounds = (
  soundToPlay?: TabataCue,
  soundEventId?: number,
  volumePercent: number = 100
) => {
  const lastPlayedIdRef = useRef<number | null>(null)
  const timeoutsRef = useRef<number[]>([])
  const audioPoolRef = useRef<Record<AudioKey, HTMLAudioElement[]>>({
    LONG: [createAudioElement(TABATA_AUDIO_SOURCES.LONG)],
    SHORT: [createAudioElement(TABATA_AUDIO_SOURCES.SHORT)],
  })

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      timeoutsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!soundToPlay || !soundEventId) {
      return
    }
    if (lastPlayedIdRef.current === soundEventId) {
      return
    }

    const timeline = TIMELINES[soundToPlay]
    const masterScalar = volumeToScalar(volumePercent)

    // Always record the event so we do not retry the same cue endlessly.
    lastPlayedIdRef.current = soundEventId

    if (!timeline || masterScalar <= 0) {
      return
    }

    const pool = audioPoolRef.current

    const getAudio = (key: AudioKey): HTMLAudioElement | null => {
      const entries = pool[key]
      if (!entries) {
        return null
      }
      const idle = entries.find((audio) => audio.paused)
      if (idle) {
        idle.currentTime = 0
        return idle
      }
      const fresh = createAudioElement(TABATA_AUDIO_SOURCES[key])
      entries.push(fresh)
      return fresh
    }

    timeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
    timeoutsRef.current = []

    timeline.forEach(({ audio, delay }) => {
      const timeoutId = window.setTimeout(
        () => {
          const element = getAudio(audio)
          if (!element) {
            return
          }
          element.volume = masterScalar
          element.currentTime = 0
          const playPromise = element.play()
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((error) => {
              console.warn('[useTabataSounds] Failed to play audio:', error)
            })
          }
        },
        Math.max(0, delay)
      )
      timeoutsRef.current.push(timeoutId)
    })
  }, [soundToPlay, soundEventId, volumePercent])
}

export default useTabataSounds
