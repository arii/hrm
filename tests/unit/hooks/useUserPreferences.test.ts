/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useUserPreferences,
  DEFAULT_PREFERENCES,
} from '@/hooks/useUserPreferences'

describe('useUserPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  it('should return default values when no data is in localStorage', () => {
    const { result } = renderHook(() => useUserPreferences())
    const [prefs] = result.current
    expect(prefs).toEqual(DEFAULT_PREFERENCES)
  })

  it('should set and retrieve a preference', async () => {
    const { result } = renderHook(() => useUserPreferences())
    act(() => {
      const setPrefs = result.current[1]
      setPrefs((prev) => ({ ...prev, userWeight: 80 }))
    })

    const [prefs] = result.current
    expect(prefs.userWeight).toBe(80)

    // Verify persistence by re-rendering
    const { result: result2 } = renderHook(() => useUserPreferences())
    await waitFor(() => {
      const [prefs2] = result2.current
      expect(prefs2.userWeight).toBe(80)
    })
  })

  it('should remove zombie keys not present in the current schema', () => {
    const zombieState = {
      ...DEFAULT_PREFERENCES,
      obsoleteSetting_v1: 'legacy_value',
    }
    window.localStorage.setItem('user-prefs', JSON.stringify(zombieState))

    const { result } = renderHook(() => useUserPreferences())
    const [prefs] = result.current
    expect(
      (prefs as Record<string, unknown>).obsoleteSetting_v1
    ).toBeUndefined()
  })

  it('should merge older schemas with current defaults', () => {
    const oldPrefs = { theme: 'light', volumeLevel: 50 }
    window.localStorage.setItem('user-prefs', JSON.stringify(oldPrefs))
    const { result } = renderHook(() => useUserPreferences())
    const [prefs] = result.current
    expect(prefs.theme).toBe('light')
    expect(prefs.volumeLevel).toBe(50)
    expect(prefs.userWeight).toBe(DEFAULT_PREFERENCES.userWeight)
    expect(prefs.autoConnect).toBe(DEFAULT_PREFERENCES.autoConnect)
  })

  describe('Migration from old keys', () => {
    it('should migrate all old keys to the new user-prefs object', () => {
      window.localStorage.setItem('hrm-user-name', 'Old User')
      window.localStorage.setItem('hrm-user-age', '45')
      window.localStorage.setItem('hrm-user-weight', '88')
      window.localStorage.setItem('hrm-user-height', '182')
      window.localStorage.setItem('hrm-user-gender', 'FEMALE')
      window.localStorage.setItem('hrm-user-units', 'IMPERIAL')
      window.localStorage.setItem('hrm-device-id', 'old-device-123')

      const { result } = renderHook(() => useUserPreferences())

      const [prefs] = result.current
      expect(prefs.userName).toBe('Old User')
      expect(prefs.userAge).toBe(45)
      expect(prefs.userWeight).toBe(88)
      expect(prefs.userHeight).toBe(182)
      expect(prefs.gender).toBe('FEMALE')
      expect(prefs.unitSystem).toBe('IMPERIAL')
      expect(prefs.deviceId).toBe('old-device-123')
      // A default from the new schema should still exist
      expect(prefs.autoConnect).toBe(true)
    })

    it('should remove old keys after successful migration', () => {
      window.localStorage.setItem('hrm-user-name', 'Old User')
      renderHook(() => useUserPreferences())
      expect(window.localStorage.getItem('hrm-user-name')).toBeNull()
      expect(window.localStorage.getItem('user-prefs')).toBeDefined()
    })

    it('should not migrate if no old keys are present', () => {
      renderHook(() => useUserPreferences())
      expect(console.log).not.toHaveBeenCalledWith(
        'Migrating old user settings from individual localStorage keys...'
      )
    })
  })
})
