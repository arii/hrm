/** @jest-environment jsdom */

import { audioManager } from '@/utils/audioManager'

describe('audioManager beep preference', () => {
  beforeEach(() => {
    audioManager.setMuted(false)
    audioManager.setVolume(70)
  })

  it('adopts a mute or volume change made in another tab', () => {
    const listener = jest.fn()
    const unsubscribe = audioManager.subscribe(listener)
    localStorage.setItem('hrm-timer-muted', 'true')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'hrm-timer-muted' })
    )
    expect(audioManager.getPreference()).toEqual({ volume: 70, muted: true })
    expect(listener).toHaveBeenCalledTimes(1)

    localStorage.setItem('hrm-timer-volume', '35')
    localStorage.setItem('hrm-timer-muted', 'false')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'hrm-timer-volume' })
    )
    expect(audioManager.getPreference()).toEqual({ volume: 35, muted: false })
    unsubscribe()
  })

  it('ignores storage changes to unrelated keys', () => {
    localStorage.setItem('hrm-timer-muted', 'true')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'hrm-preferred-volume' })
    )
    expect(audioManager.getMuted()).toBe(false)
  })

  it('reports own-control changes but not server ones', () => {
    const local = jest.fn()
    const unsubscribe = audioManager.onLocalChange(local)
    audioManager.setVolume(40)
    expect(local).toHaveBeenCalledWith({ volume: 40, muted: false })

    audioManager.applyRemote({ volume: 20, muted: true })
    expect(audioManager.getPreference()).toEqual({ volume: 20, muted: true })
    expect(localStorage.getItem('hrm-timer-muted')).toBe('true')
    expect(local).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('treats a relayed zero volume as mute', () => {
    audioManager.setVolume(45)
    audioManager.applyRemote({ volume: 0, muted: false })
    expect(audioManager.getPreference()).toEqual({ volume: 45, muted: true })
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

  it('treats zero as mute and unmute restores the last audible level', () => {
    audioManager.setVolume(5)
    audioManager.setVolume(0)
    expect(audioManager.getPreference()).toEqual({ volume: 5, muted: true })
    audioManager.toggleMute()
    expect(audioManager.getPreference()).toEqual({ volume: 5, muted: false })
  })

  it('reads a stored zero volume as muted at the default level', () => {
    localStorage.setItem('hrm-timer-volume', '0')
    localStorage.setItem('hrm-timer-muted', 'false')
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@/utils/audioManager').audioManager
      expect(fresh.getPreference()).toEqual({ volume: 70, muted: true })
    })
  })

  it('keeps the audio elements silent while muted, including unlock', () => {
    const volumes: number[] = []
    const play = jest
      .spyOn(HTMLMediaElement.prototype, 'play')
      .mockImplementation(function (this: HTMLMediaElement) {
        volumes.push(this.volume)
        return Promise.resolve()
      })
    audioManager.setVolume(55)
    audioManager.setMuted(true)
    audioManager.loadAudio()
    expect(volumes).toEqual([0, 0])
    play.mockRestore()
  })
})
