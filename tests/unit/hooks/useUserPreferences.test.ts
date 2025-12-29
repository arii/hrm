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

  it('should handle migration from older schema', async () => {
    // Simulate a pre-existing localStorage item with an older schema
    const oldPrefs = {
      theme: 'light',
      volumeLevel: 50,
    }
    window.localStorage.setItem('user-prefs', JSON.stringify(oldPrefs))

    const { result } = renderHook(() => useUserPreferences())

    await waitFor(() => {
      const [prefs] = result.current
      // Verify that old data is preserved
      expect(prefs.theme).toBe('light')
      expect(prefs.volumeLevel).toBe(50)

      // Verify that new fields are initialized to their default values
      expect(prefs.userWeight).toBeNull()
      expect(prefs.autoConnect).toBe(false)
    })
  })
})
