/**
 * Audio Manager for Tabata Timer Sounds
 * Handles beep sounds for countdown and phase transitions
 */
import { makeAutoObservable } from 'mobx'

export class AudioManager {
  private shortBeep: HTMLAudioElement | null = null
  private longBeep: HTMLAudioElement | null = null
  isMuted = false
  isAudioContextUnlocked = false
  volume = 0.7 // Default volume

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAudio()
    }
    makeAutoObservable(this)
  }

  private initializeAudio() {
    this.shortBeep = new Audio('/assets/beep-07.wav')
    this.longBeep = new Audio('/assets/beep-01a.wav')
    this.shortBeep.volume = this.volume
    this.longBeep.volume = this.volume
  }

  unlockAudioContext = () => {
    if (this.isAudioContextUnlocked || !this.shortBeep || !this.longBeep) return

    console.log('[AudioManager] Unlocking audio context via user interaction')

    const unlock = (audio: HTMLAudioElement) => {
      audio
        .play()
        .then(() => {
          audio.pause()
          audio.currentTime = 0
          this.isAudioContextUnlocked = true
          console.log('[AudioManager] Audio context unlocked successfully.')
        })
        .catch((e) => {
          console.warn('[AudioManager] Failed to unlock audio context:', e)
        })
    }

    // Attempt to unlock with the first beep
    unlock(this.shortBeep)
  }

  playShort = () => {
    if (this.isMuted) return
    if (!this.shortBeep) return
    this.shortBeep.currentTime = 0
    this.shortBeep.play().catch((e) => console.error('Failed to play:', e))
  }

  playLong = () => {
    if (this.isMuted) return
    if (!this.longBeep) return
    this.longBeep.currentTime = 0
    this.longBeep.play().catch((e) => console.error('Failed to play:', e))
  }

  setVolume = (volumePercent: number) => {
    this.volume = Math.max(0, Math.min(1, volumePercent / 100))
    if (this.shortBeep) this.shortBeep.volume = this.volume
    if (this.longBeep) this.longBeep.volume = this.volume
  }

  toggleMute = () => {
    this.isMuted = !this.isMuted
  }
}

export const audioManager = new AudioManager()
