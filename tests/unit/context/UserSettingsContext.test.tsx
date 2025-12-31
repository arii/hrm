/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import {
  UserSettingsProvider,
  useUserSettings,
} from '@/context/UserSettingsContext'

describe('UserSettingsContext', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('should load default preferences', () => {
    const { result } = renderHook(() => useUserSettings(), {
      wrapper: UserSettingsProvider,
    })

    const [settings] = result.current
    expect(settings.theme).toBe('dark')
    expect(settings.userName).toBe('')
  })

  it('should save preferences to localStorage', () => {
    const { result } = renderHook(() => useUserSettings(), {
      wrapper: UserSettingsProvider,
    })

    act(() => {
      const [, setSettings] = result.current
      setSettings((prev) => ({ ...prev, userName: 'Test User' }))
    })

    const storedSettings = JSON.parse(
      window.localStorage.getItem('user-prefs') || '{}'
    )
    expect(storedSettings.userName).toBe('Test User')
  })

  it('should load preferences from localStorage', () => {
    window.localStorage.setItem(
      'user-prefs',
      JSON.stringify({ userName: 'Stored User' })
    )

    const { result } = renderHook(() => useUserSettings(), {
      wrapper: UserSettingsProvider,
    })

    const [settings] = result.current
    expect(settings.userName).toBe('Stored User')
  })

  it('should update preferences', () => {
    const { result } = renderHook(() => useUserSettings(), {
      wrapper: UserSettingsProvider,
    })

    act(() => {
      const [, setSettings] = result.current
      setSettings((prev) => ({ ...prev, theme: 'light' }))
    })

    const [settings] = result.current
    expect(settings.theme).toBe('light')
  })

  it('should merge stored preferences with defaults, adding new keys', () => {
    const oldPreferences = {
      theme: 'light',
      userName: 'Old User',
      // Missing other default keys
    }
    window.localStorage.setItem('user-prefs', JSON.stringify(oldPreferences))

    const { result } = renderHook(() => useUserSettings(), {
      wrapper: UserSettingsProvider,
    })

    const [settings] = result.current
    expect(settings.userName).toBe('Old User') // Stored value should persist
    expect(settings.theme).toBe('light') // Stored value should persist
    expect(settings.volumeLevel).toBe(70) // Default value for new key
  })

  it('should filter out "zombie" keys from localStorage', () => {
    const oldPreferences = {
      userName: 'Zombie User',
      zombieKey: 'this should be removed',
    }
    window.localStorage.setItem('user-prefs', JSON.stringify(oldPreferences))

    const { result } = renderHook(() => useUserSettings(), {
      wrapper: UserSettingsProvider,
    })

    const [settings] = result.current
    expect(settings.userName).toBe('Zombie User')
    expect(settings).not.toHaveProperty('zombieKey')

    // Also check that the cleaned data is written back to localStorage
    const storedSettings = JSON.parse(
      window.localStorage.getItem('user-prefs') || '{}'
    )
    expect(storedSettings).not.toHaveProperty('zombieKey')
  })
})
