/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import Cookies from 'js-cookie'
import usePersistentStorage from '../../../hooks/usePersistentStorage'

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
}))

describe('usePersistentStorage', () => {
  const originalLocalStorage = window.localStorage
  const TEST_KEY = 'test-key'
  const INITIAL_VALUE = { foo: 'bar' }
  const UPDATED_VALUE = { foo: 'baz' }

  beforeEach(() => {
    jest.clearAllMocks()
    window.localStorage.clear()
    // Reset localStorage to original state
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  })

  it('should use localStorage when available', () => {
    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, INITIAL_VALUE)
    )

    act(() => {
      const [, setValue] = result.current
      setValue(UPDATED_VALUE)
    })

    expect(JSON.parse(window.localStorage.getItem(TEST_KEY)!)).toEqual(
      UPDATED_VALUE
    )
    expect(Cookies.set).not.toHaveBeenCalled()
  })

  it('should use cookies when localStorage is not available AND fallback is enabled', () => {
    // Mock localStorage to be unavailable
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: () => {
          throw new Error('Storage full')
        },
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, INITIAL_VALUE, {
        enableCookieFallback: true,
      })
    )

    act(() => {
      const [, setValue] = result.current
      setValue(UPDATED_VALUE)
    })

    expect(Cookies.set).toHaveBeenCalledWith(
      TEST_KEY,
      JSON.stringify(UPDATED_VALUE),
      expect.any(Object)
    )
  })

  it('should NOT use cookies when localStorage is not available and fallback is disabled', () => {
    // Mock localStorage to be unavailable
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: () => {
          throw new Error('Storage full')
        },
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, INITIAL_VALUE)
    )

    act(() => {
      const [, setValue] = result.current
      setValue(UPDATED_VALUE)
    })

    expect(Cookies.set).not.toHaveBeenCalled()
    // Should still update state (in-memory)
    expect(result.current[0]).toEqual(UPDATED_VALUE)
  })

  it('should not fallback to cookies when localStorage is available but write fails', () => {
    // Mock localStorage: setItem works for the test key (so checkLocalStorage passes)
    // but fails for the data key.
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn((key, _value) => {
          if (key === '__hrm_test__') {
            return // Success for check
          }
          throw new Error('QuotaExceeded')
        }),
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, INITIAL_VALUE, {
        enableCookieFallback: true,
      })
    )

    act(() => {
      const [, setValue] = result.current
      setValue(UPDATED_VALUE)
    })

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      TEST_KEY,
      JSON.stringify(UPDATED_VALUE)
    )
    expect(Cookies.set).not.toHaveBeenCalled()
  })

  it('should load initial value from localStorage if present', () => {
    window.localStorage.setItem(TEST_KEY, JSON.stringify(UPDATED_VALUE))

    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, INITIAL_VALUE)
    )

    expect(result.current[0]).toEqual(UPDATED_VALUE)
  })

  it('should load initial value from cookies if localStorage is not available and cookies have value and fallback enabled', () => {
    // Mock localStorage to be unavailable
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: () => {
          throw new Error('Storage full')
        },
        getItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
      configurable: true,
    })
    ;(Cookies.get as jest.Mock).mockReturnValue(JSON.stringify(UPDATED_VALUE))

    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, INITIAL_VALUE, {
        enableCookieFallback: true,
      })
    )

    expect(result.current[0]).toEqual(UPDATED_VALUE)
  })

  it('should reload data when key changes', () => {
    const OTHER_KEY = 'other-key'
    const OTHER_VALUE = { bar: 'baz' }
    window.localStorage.setItem(TEST_KEY, JSON.stringify(UPDATED_VALUE))
    window.localStorage.setItem(OTHER_KEY, JSON.stringify(OTHER_VALUE))

    const { result, rerender } = renderHook(
      ({ key }) => usePersistentStorage(key, INITIAL_VALUE),
      {
        initialProps: { key: TEST_KEY },
      }
    )

    expect(result.current[0]).toEqual(UPDATED_VALUE)

    rerender({ key: OTHER_KEY })

    expect(result.current[0]).toEqual({ ...INITIAL_VALUE, ...OTHER_VALUE })
  })

  it('should merge new fields from initialValue into stored value', () => {
    const OLD_STORED_VALUE = { foo: 'bar' }
    const NEW_INITIAL_VALUE = { foo: 'default', newField: 'newValue' }
    // Expected: foo comes from storage (preserved), newField comes from initialValue
    const EXPECTED_VALUE = { foo: 'bar', newField: 'newValue' }

    window.localStorage.setItem(TEST_KEY, JSON.stringify(OLD_STORED_VALUE))

    const { result } = renderHook(() =>
      usePersistentStorage(TEST_KEY, NEW_INITIAL_VALUE)
    )

    expect(result.current[0]).toEqual(EXPECTED_VALUE)

    // Verify it updated storage with the merged value
    expect(JSON.parse(window.localStorage.getItem(TEST_KEY)!)).toEqual(
      EXPECTED_VALUE
    )
  })

  it('should update state if initialValue changes dynamically', () => {
     // This tests the fix for "Problem 2"
     const { result, rerender } = renderHook(
       ({ initVal }) => usePersistentStorage(TEST_KEY, initVal),
       {
         initialProps: { initVal: INITIAL_VALUE }
       }
     )

     // First render: uses INITIAL_VALUE ({ foo: 'bar' })
     expect(result.current[0]).toEqual(INITIAL_VALUE)

     // Update initialValue
     const NEW_INITIAL_VALUE = { foo: 'changed' }
     rerender({ initVal: NEW_INITIAL_VALUE })

     // Since storage was empty, it should pick up the new initial value?
     // Wait, on first render, it sets state to INITIAL_VALUE.
     // Storage is empty.
     // In second render, it checks storage (empty).
     // Else block: checks if initialValue !== current.
     // Updates to NEW_INITIAL_VALUE.
     expect(result.current[0]).toEqual(NEW_INITIAL_VALUE)
  })
})
