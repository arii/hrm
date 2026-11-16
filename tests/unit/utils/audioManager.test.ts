/** @jest-environment jsdom */

import { audioManager } from '@/utils/audioManager'

describe('audioManager beep preference', () => {
  beforeEach(() => {
    audioManager.setMuted(false)
    audioManager.setVolume(70)
  })

  it('persists volume and mute under the timer-only keys', () => {
    audioManager.setVolume(40)
    audioManager.setMuted(true)
    expect(localStorage.getItem('hrm-timer-volume')).toBe('40')
    expect(localStorage.getItem('hrm-timer-muted')).toBe('true')
    expect(localStorage.getItem('hrm-preferred-volume')).toBeNull()
  })

  it('unmutes when an audible volume is chosen and keeps the level when muting', () => {
    audioManager.setVolume(55)
    audioManager.toggleMute()
    expect(audioManager.getPreference()).toEqual({ volume: 55, muted: true })
    audioManager.setVolume(30)
    expect(audioManager.getPreference()).toEqual({ volume: 30, muted: false })
  })

  it('notifies subscribers only when the preference changes', () => {
    const listener = jest.fn()
    const unsubscribe = audioManager.subscribe(listener)
    audioManager.setVolume(70)
    expect(listener).not.toHaveBeenCalled()
    audioManager.setVolume(65)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    audioManager.setVolume(60)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('restores the stored preference on load', () => {
    localStorage.setItem('hrm-timer-volume', '25')
    localStorage.setItem('hrm-timer-muted', 'true')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@/utils/audioManager').audioManager
      expect(fresh.getPreference()).toEqual({ volume: 25, muted: true })
    })
  })
})
