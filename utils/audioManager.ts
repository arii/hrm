/**
 * Audio Manager for Tabata Timer Sounds
 * Handles beep sounds for countdown and phase transitions
 *
 * @public
 */

import { getBasePath } from './urls'
import logger from './logger'

// Beep preferences persist under their own keys, never the Spotify music
// volume keys, so beeps and music cannot move each other.
const BEEP_VOLUME_KEY = 'hrm-timer-volume'
const BEEP_MUTED_KEY = 'hrm-timer-muted'
const DEFAULT_BEEP_VOLUME = 70

interface BeepPreference {
  volume: number
  muted: boolean
}

export const DEFAULT_BEEP_PREFERENCE: BeepPreference = {
  volume: DEFAULT_BEEP_VOLUME,
  muted: false,
}

const clampPercent = (value: number): number =>
  Math.min(100, Math.max(0, Math.round(value)))

class AudioManager {
  private shortBeep: HTMLAudioElement | null = null
  private longBeep: HTMLAudioElement | null = null
  private loadedAudio = false
  private preference: BeepPreference = DEFAULT_BEEP_PREFERENCE
  private listeners = new Set<() => void>()

  constructor() {
    if (typeof window !== 'undefined') {
      this.preference = this.readStoredPreference()
      this.initializeAudio()
      window.addEventListener('storage', this.handleStorage)
    }
  }

  // Every open dashboard tab plays the beeps, so a change in one tab
  // must reach the others or they keep beeping at the old level.
  private handleStorage = (event: StorageEvent) => {
    if (event.key === BEEP_VOLUME_KEY || event.key === BEEP_MUTED_KEY) {
      this.applyPreference(this.readStoredPreference())
    }
  }

  private initializeAudio() {
    const basePath = getBasePath()
    this.shortBeep = new Audio(`${basePath}/assets/beep-07.wav`)
    this.longBeep = new Audio(`${basePath}/assets/beep-01a.wav`)
    this.applyVolume()
  }

  private readStoredPreference(): BeepPreference {
    try {
      const storedVolume = window.localStorage.getItem(BEEP_VOLUME_KEY)
      const parsed = Number(storedVolume)
      return {
        // A stored 0 predates zero-as-mute; read it as muted at the default.
        volume:
          storedVolume !== null && Number.isFinite(parsed) && parsed > 0
            ? clampPercent(parsed)
            : DEFAULT_BEEP_VOLUME,
        muted:
          window.localStorage.getItem(BEEP_MUTED_KEY) === 'true' ||
          (storedVolume !== null && parsed === 0),
      }
    } catch {
      return DEFAULT_BEEP_PREFERENCE
    }
  }

  // Muted elements run at zero so the unlock play() stays silent too.
  private applyVolume() {
    const { muted } = this.preference
    const level = muted ? 0 : this.preference.volume / 100
    for (const beep of [this.shortBeep, this.longBeep]) {
      if (!beep) continue
      beep.volume = level
      beep.muted = muted
    }
  }

  private applyPreference(next: BeepPreference): boolean {
    if (
      next.volume === this.preference.volume &&
      next.muted === this.preference.muted
    ) {
      return false
    }
    this.preference = next
    this.applyVolume()
    this.listeners.forEach((listener) => listener())
    return true
  }

  private updatePreference(next: BeepPreference) {
    if (!this.applyPreference(next)) return
    try {
      window.localStorage.setItem(BEEP_VOLUME_KEY, String(next.volume))
      window.localStorage.setItem(BEEP_MUTED_KEY, String(next.muted))
    } catch (e) {
      logger.warn('[AudioManager] Could not persist beep preference:', e)
    }
  }

  /**
   * Load audio files (required for iOS - must be triggered by user interaction)
   */
  loadAudio() {
    if (!this.loadedAudio && this.shortBeep && this.longBeep) {
      logger.debug(
        '[AudioManager] Unlocking audio context via user interaction'
      )
      // On iOS you can't play back sounds unless it comes from a user
      // action first, so pretend to play the sound in this callback
      this.shortBeep
        .play()
        .then(() => {
          this.shortBeep!.pause()
          this.shortBeep!.currentTime = 0
        })
        .catch((e) => {
          logger.warn('[AudioManager] Failed to unlock short beep:', e)
        })

      this.longBeep
        .play()
        .then(() => {
          this.longBeep!.pause()
          this.longBeep!.currentTime = 0
        })
        .catch((e) => {
          logger.warn('[AudioManager] Failed to unlock long beep:', e)
        })

      this.loadedAudio = true
    }
  }

  /**
   * Play short beep (countdown seconds)
   */
  playShort() {
    if (this.preference.muted) {
      logger.debug('[AudioManager] Skipped short beep (Muted)')
      return
    }
    if (!this.shortBeep) {
      logger.debug('[AudioManager] Short beep audio not initialized')
      return
    }

    this.shortBeep.currentTime = 0
    this.shortBeep.play().catch((e) => {
      logger.error('[AudioManager] Failed to play short beep:', e)
    })
  }

  /**
   * Play long beep (phase transitions)
   */
  playLong() {
    if (this.preference.muted) {
      logger.debug('[AudioManager] Skipped long beep (Muted)')
      return
    }
    if (!this.longBeep) {
      logger.debug('[AudioManager] Long beep audio not initialized')
      return
    }

    this.longBeep.currentTime = 0
    this.longBeep.play().catch((e) => {
      logger.error('[AudioManager] Failed to play long beep:', e)
    })
  }

  /**
   * Set volume (0-100). Zero mutes and keeps the last audible level so
   * unmuting restores it; any audible volume unmutes.
   */
  setVolume(volumePercent: number) {
    const volume = clampPercent(volumePercent)
    this.updatePreference(
      volume === 0
        ? { ...this.preference, muted: true }
        : { volume, muted: false }
    )
  }

  /**
   * Get current volume (0-100)
   */
  getVolume() {
    return this.preference.volume
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.setMuted(!this.preference.muted)
    logger.debug(`[AudioManager] Muted: ${this.preference.muted}`)
    return this.preference.muted
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean) {
    this.updatePreference({ ...this.preference, muted })
  }

  /**
   * Get current mute state
   */
  getMuted() {
    return this.preference.muted
  }

  /**
   * useSyncExternalStore subscription for the beep preference.
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getPreference = (): BeepPreference => this.preference
}

// Global audio manager instance
export const audioManager = new AudioManager()
