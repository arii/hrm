/**
 * Audio Manager for Tabata Timer Sounds
 * Handles beep sounds for countdown and phase transitions
 */

export class AudioManager {
  private shortBeep: HTMLAudioElement | null = null
  private longBeep: HTMLAudioElement | null = null
  private isMuted = false
  private loadedAudio = false
  private volume = 0.7

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
      // On iOS you can't play back sounds unless it comes from a user
      // action first, so pretend to play the sound in this callback
      this.shortBeep
        .play()
        .then(() => {
          this.shortBeep!.pause()
          this.shortBeep!.currentTime = 0
        })
        .catch((e) => {})

      this.longBeep
        .play()
        .then(() => {
          this.longBeep!.pause()
          this.longBeep!.currentTime = 0
        })
        .catch((e) => {})

      this.loadedAudio = true
    }
  }

  /**
   * Play short beep (countdown seconds)
   */
  playShort() {
    if (this.isMuted) {
      return
    }
    if (!this.shortBeep) {
      return
    }

    this.shortBeep.currentTime = 0
    this.shortBeep.play().catch((e) => {})
  }

  /**
   * Play long beep (phase transitions)
   */
  playLong() {
    if (this.isMuted) {
      return
    }
    if (!this.longBeep) {
      return
    }

    this.longBeep.currentTime = 0
    this.longBeep.play().catch((e) => {})
  }

  /**
   * Set volume (0-100)
   */
  setVolume(volumePercent: number) {
    const newVolume = Math.max(0, Math.min(1, volumePercent / 100))
    this.volume = newVolume
    if (this.shortBeep) this.shortBeep.volume = this.volume
    if (this.longBeep) this.longBeep.volume = this.volume
  }

  /**
   * Get current volume (0-100)
   */
  getVolume() {
    return this.volume * 100
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.isMuted = !this.isMuted
    return this.isMuted
  }

  /**
   * Set mute state
   */
  setMuted(muted: boolean) {
    this.isMuted = muted
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
