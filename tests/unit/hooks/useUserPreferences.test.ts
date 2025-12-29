/**
 * @jest-environment jsdom
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useUserPreferences } from '@/hooks/useUserPreferences'

describe('useUserPreferences', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('should return default values', () => {
    const { result } = renderHook(() => useUserPreferences())
    const [prefs] = result.current
    expect(prefs.userWeight).toBeNull()
    expect(prefs.autoConnect).toBe(false)
  })

  it('should set and retrieve userWeight', async () => {
    const { result } = renderHook(() => useUserPreferences())

    act(() => {
      const setPrefs = result.current[1]
      setPrefs((prev) => ({ ...prev, userWeight: 80 }))
    })

    const [prefs] = result.current
    expect(prefs.userWeight).toBe(80)

    // Verify persistence
    const { result: result2 } = renderHook(() => useUserPreferences())
    await waitFor(() => {
      const [prefs2] = result2.current
      expect(prefs2.userWeight).toBe(80)
    })
  })

  it('should set and retrieve autoConnect', async () => {
    const { result } = renderHook(() => useUserPreferences())

    act(() => {
      const setPrefs = result.current[1]
      setPrefs((prev) => ({ ...prev, autoConnect: true }))
    })

    const [prefs] = result.current
    expect(prefs.autoConnect).toBe(true)

    // Verify persistence
    const { result: result2 } = renderHook(() => useUserPreferences())
    await waitFor(() => {
      const [prefs2] = result2.current
      expect(prefs2.autoConnect).toBe(true)
    })
  })

  it('should remove zombie keys not present in the current schema', async () => {
    // Setup storage with an obsolete key
    const zombieState = {
      favoritePlaylist: 'Chill Lo-Fi',
      obsoleteSetting_v1: 'legacy_value', // This key is NOT in defaultValues
    }
    window.localStorage.setItem('user-prefs', JSON.stringify(zombieState))

    const { result } = renderHook(() => useUserPreferences())

    await waitFor(() => {
      const [prefs] = result.current
      // Valid key remains
      expect(prefs.favoritePlaylist).toBe('Chill Lo-Fi')
      // Zombie key is stripped
      expect(
        (prefs as Record<string, unknown>).obsoleteSetting_v1
      ).toBeUndefined()
    })
  })

  it('should correctly merge older schemas with current defaults', async () => {
    // Simulate a pre-existing localStorage item with a subset of keys.
    const oldPrefs = {
      theme: 'light', // Overridden value
      volumeLevel: 50, // Overridden value
    }
    window.localStorage.setItem('user-prefs', JSON.stringify(oldPrefs))

    const { result } = renderHook(() => useUserPreferences())

    await waitFor(() => {
      const [prefs] = result.current
      // Verify that stored data is preserved
      expect(prefs.theme).toBe('light')
      expect(prefs.volumeLevel).toBe(50)

      // Verify that new fields (not in oldPrefs) are initialized to their default values
      expect(prefs.userWeight).toBeNull() // default from useUserPreferences
      expect(prefs.autoConnect).toBe(false) // default from useUserPreferences
      expect(prefs.userName).toBe('') // default from useUserPreferences
    })
  })
})
