/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import useLocalStorage from '../../../hooks/useLocalStorage'

describe('useLocalStorage', () => {
  const KEY = 'test-key'

  // Mock localStorage
  let store: Record<string, string> = {}
  const localStorageMock = {
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
    key: (index: number) => Object.keys(store)[index],
    length: Object.keys(store).length,
  }

  beforeEach(() => {
    store = {}
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    })
  })

  it('should return initialValue when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 'default'))
    expect(result.current[0]).toBe('default')
  })

  it('should return stored value when localStorage has data', () => {
    localStorage.setItem(KEY, JSON.stringify('stored'))
    const { result } = renderHook(() => useLocalStorage(KEY, 'default'))
    expect(result.current[0]).toBe('stored')
  })

  it('should update localStorage when the value changes', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 'default'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify('new-value'))
  })

  it('should handle object values', () => {
    const initial = { a: 1 }
    const updated = { a: 2 }
    localStorage.setItem(KEY, JSON.stringify({ a: 1 }))

    const { result } = renderHook(() => useLocalStorage(KEY, { a: 0 }))

    expect(result.current[0]).toEqual(initial)

    act(() => {
      result.current[1](updated)
    })

    expect(result.current[0]).toEqual(updated)
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify(updated))
  })

  it('should merge with initial value and prune zombie keys', () => {
    const initialSchema = { a: 1, b: 'default' }
    const storedState = { a: 100, zombie: 'should-be-removed' }
    localStorage.setItem(KEY, JSON.stringify(storedState))

    const { result } = renderHook(() => useLocalStorage(KEY, initialSchema))

    // It should take the stored value for 'a' and the default for 'b'.
    expect(result.current[0]).toEqual({ a: 100, b: 'default' })

    // It should have pruned the zombie key from localStorage immediately.
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}')
    expect(stored).not.toHaveProperty('zombie')
    expect(stored).toEqual({ a: 100, b: 'default' })
  })

  it('should handle storage events from other tabs', () => {
    const { result } = renderHook(() => useLocalStorage(KEY, 'initial'))

    // Simulate a storage event
    const event = new StorageEvent('storage', {
      key: KEY,
      newValue: JSON.stringify('from-another-tab'),
    })
    act(() => {
      window.dispatchEvent(event)
    })

    expect(result.current[0]).toBe('from-another-tab')
  })

  it('should handle malformed JSON in localStorage gracefully', () => {
    localStorage.setItem(KEY, 'not-a-json')
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage(KEY, 'default'))

    expect(result.current[0]).toBe('default')
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
