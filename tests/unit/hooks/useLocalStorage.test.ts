/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useLocalStorage from '../../../hooks/useLocalStorage'
import { UserPreferences } from '../../../context/UserSettingsContext'

// Mocking localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    clear: () => {
      store = {}
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

const TEST_KEY = 'user-prefs'
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  volumeLevel: 70,
  defaultWorkDuration: 20,
  defaultRestDuration: 10,
  favoritePlaylist: '',
  userName: '',
  userAge: null,
  userWeight: null,
  autoConnect: false,
  gender: 'MALE',
  unitSystem: 'IMPERIAL',
}

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('should return the initial value when localStorage is empty', () => {
    const { result } = renderHook(() =>
      useLocalStorage(TEST_KEY, DEFAULT_PREFERENCES)
    )
    expect(result.current[0]).toEqual(DEFAULT_PREFERENCES)
  })

  it('should load and parse a valid value from localStorage', () => {
    const storedPrefs = { ...DEFAULT_PREFERENCES, userName: 'Jane Doe', userAge: 35 }
    window.localStorage.setItem(TEST_KEY, JSON.stringify(storedPrefs))

    const { result } = renderHook(() =>
      useLocalStorage(TEST_KEY, DEFAULT_PREFERENCES)
    )

    expect(result.current[0].userName).toBe('Jane Doe')
    expect(result.current[0].userAge).toBe(35)
  })

  it('should sanitize corrupted userAge from localStorage', () => {
    // Simulate the bug: userAge is incorrectly stored as a string (the user's name)
    const corruptedPrefs = { ...DEFAULT_PREFERENCES, userName: 'Jane Doe', userAge: 'Jane Doe' }
    window.localStorage.setItem(TEST_KEY, JSON.stringify(corruptedPrefs))

    const { result } = renderHook(() =>
      useLocalStorage(TEST_KEY, DEFAULT_PREFERENCES)
    )

    // The hook should detect the invalid type and reset userAge to its default (null)
    expect(result.current[0].userAge).toBeNull()
    // The user name should still be loaded correctly
    expect(result.current[0].userName).toBe('Jane Doe')
  })

  it('should sanitize corrupted userName from localStorage', () => {
    // Simulate a case where userName is not a string
    const corruptedPrefs = { ...DEFAULT_PREFERENCES, userName: 12345, userAge: 30 }
    window.localStorage.setItem(TEST_KEY, JSON.stringify(corruptedPrefs))

     const { result } = renderHook(() =>
      useLocalStorage(TEST_KEY, DEFAULT_PREFERENCES)
    )

    // The hook should detect the invalid type and reset userName to its default ('')
    expect(result.current[0].userName).toBe('')
    // The age should still be loaded correctly
    expect(result.current[0].userAge).toBe(30)
  })

  it('should update localStorage when setValue is called', () => {
    const { result } = renderHook(() =>
      useLocalStorage(TEST_KEY, DEFAULT_PREFERENCES)
    )

    act(() => {
      const [, setValue] = result.current
      setValue(prev => ({...prev, userName: 'John Doe'}))
    })

    expect(result.current[0].userName).toBe('John Doe')
    const fromStorage = JSON.parse(window.localStorage.getItem(TEST_KEY)!)
    expect(fromStorage.userName).toBe('John Doe')
  })
})
