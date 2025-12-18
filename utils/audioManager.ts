/**
 * Audio Manager for Tabata Timer Sounds
 * Handles beep sounds for countdown and phase transitions
 */

export class AudioManager {
  private shortBeep: HTMLAudioElement | null = null
  private longBeep: HTMLAudioElement | null = null
  private isMuted = false
  private loadedAudio = false
  private volume = 1.0 // Default to max, will be overridden by user preference

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeAudio()
    }
  }

  private initializeAudio() {
    this.shortBeep = new Audio('/assets/beep-07.wav')
    this.longBeep = new Audio('/assets/beep-01a.wav')

    this.shortBeep.volume = this.volume
    this.longBeep.volume = this.volume
  }

  /**
   * Load audio files (required for iOS - must be triggered by user interaction)
   */
  loadAudio() {
    if (!this.loadedAudio && this.shortBeep && this.longBeep) {
      console.log('[AudioManager] Unlocking audio context via user interaction')
      // On iOS you can't play back sounds unless it comes from a user
      // action first, so pretend to play the sound in this callback
      this.shortBeep
        .play()
        .then(() => {
          this.shortBeep!.pause()
          this.shortBeep!.currentTime = 0
        })
        .catch((e) => {
          console.warn('[AudioManager] Failed to unlock short beep:', e)
        })

      this.longBeep
        .play()
        .then(() => {
          this.longBeep!.pause()
          this.longBeep!.currentTime = 0
        })
        .catch((e) => {
          console.warn('[AudioManager] Failed to unlock long beep:', e)
        })

      this.loadedAudio = true
    }
  }

  /**
   * Play short beep (countdown seconds)
   */
  playShort() {
    if (this.isMuted) {
      console.log('[AudioManager] Skipped short beep (Muted)')
      return
    }
    if (!this.shortBeep) {
      console.warn('[AudioManager] Short beep audio not initialized')
      return
    }

    this.shortBeep.currentTime = 0
    this.shortBeep.play().catch((e) => {
      console.error('[AudioManager] Failed to play short beep:', e)
    })
  }

  /**
   * Play long beep (phase transitions)
   */
  playLong() {
    if (this.isMuted) {
      console.log('[AudioManager] Skipped long beep (Muted)')
      return
    }
    if (!this.longBeep) {
      console.warn('[AudioManager] Long beep audio not initialized')
      return
    }

    this.longBeep.currentTime = 0
    this.longBeep.play().catch((e) => {
      console.error('[AudioManager] Failed to play long beep:', e)
    })
  }

  /**
   * Set volume (0-100)
   */
  setVolume(volumePercent: number) {
    this.volume = volumePercent / 100
    if (this.shortBeep) this.shortBeep.volume = this.volume
    if (this.longBeep) this.longBeep.volume = this.volume
    // console.log(`[AudioManager] Volume set to ${this.volume}`)
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted
    console.log(`[AudioManager] Muted: ${this.isMuted}`)
    return this.isMuted
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean) {
    this.isMuted = muted
    // console.log(`[AudioManager] Muted set to: ${this.isMuted}`)
  }

  /**
   * Get current mute state
   */
  getMuted() {
    return this.isMuted
  }
}

// Global audio manager instance
export const audioManager = new AudioManager()
