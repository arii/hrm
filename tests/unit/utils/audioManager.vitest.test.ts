import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AudioManager } from '../../../utils/audioManager'

// A more robust mock for HTMLAudioElement
class MockAudioElement {
  play = vi.fn(() => Promise.resolve())
  pause = vi.fn()
  volume = 0
  currentTime = 0
}

global.HTMLAudioElement = MockAudioElement as unknown as new () => HTMLAudioElement

describe('AudioManager', () => {
  let audioManager: AudioManager

  beforeEach(() => {
    vi.clearAllMocks()
    audioManager = new AudioManager()
  })

  it('should initialize with default volume and not muted', () => {
    expect(audioManager.getVolume()).toBe(70)
    expect(audioManager.getMuted()).toBe(false)
  })

  it('should set volume correctly', () => {
    audioManager.setVolume(50)
    expect(audioManager.getVolume()).toBe(50)
  })

  it('should not allow volume to go below 0', () => {
    audioManager.setVolume(-10)
    expect(audioManager.getVolume()).toBe(0)
  })

  it('should not allow volume to go above 100', () => {
    audioManager.setVolume(110)
    expect(audioManager.getVolume()).toBe(100)
  })

  it('should toggle mute state', () => {
    const isMuted = audioManager.toggleMute()
    expect(isMuted).toBe(true)
    expect(audioManager.getMuted()).toBe(true)
  })

  it('should set mute state', () => {
    audioManager.setMuted(true)
    expect(audioManager.getMuted()).toBe(true)
  })

  it('should play short beep when not muted', () => {
    const audio = new HTMLAudioElement()
    audioManager['shortBeep'] = audio // Access private property for test
    audioManager.playShort()
    expect(audio.play).toHaveBeenCalled()
  })

  it('should not play short beep when muted', () => {
    const audio = new HTMLAudioElement()
    audioManager['shortBeep'] = audio
    audioManager.setMuted(true)
    audioManager.playShort()
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('should play long beep when not muted', () => {
    const audio = new HTMLAudioElement()
    audioManager['longBeep'] = audio
    audioManager.playLong()
    expect(audio.play).toHaveBeenCalled()
  })

  it('should not play long beep when muted', () => {
    const audio = new HTMLAudioElement()
    audioManager['longBeep'] = audio
    audioManager.setMuted(true)
    audioManager.playLong()
    expect(audio.play).not.toHaveBeenCalled()
  })
})
