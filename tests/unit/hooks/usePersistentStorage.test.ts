/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'

// Mock the underlying storage hooks
jest.mock('../../../hooks/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(() => [null, jest.fn()]),
}))
jest.mock('../../../hooks/useCookie', () => ({
  __esModule: true,
  default: jest.fn(() => [null, jest.fn()]),
}))

describe('usePersistentStorage', () => {
  const originalLocalStorage = window.localStorage

  beforeEach(() => {
    jest.resetModules() // This is crucial to re-evaluate the module-level logic
  })

  afterEach(() => {
    // Restore localStorage after each test
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    })
  })

  it('should select useLocalStorage when localStorage is available', () => {
    // Ensure localStorage is functional
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: jest.fn(),
        removeItem: jest.fn(),
        getItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    })

    // Re-require the mocks and the hook under test within this scope
    const useLocalStorage = require('../../../hooks/useLocalStorage').default
    const useCookie = require('../../../hooks/useCookie').default
    const usePersistentStorage =
      require('../../../hooks/usePersistentStorage').default

    renderHook(() => usePersistentStorage('test', ''))

    expect(useLocalStorage).toHaveBeenCalled()
    expect(useCookie).not.toHaveBeenCalled()
  })

  it('should select useCookie when localStorage is not available', () => {
    // Break localStorage by making setItem throw an error
    Object.defineProperty(window, 'localStorage', {
      value: {
        setItem: () => {
          throw new Error('Access Denied')
        },
        getItem: jest.fn(),
      },
      writable: true,
      configurable: true,
    })

    // Re-require the mocks and the hook under test within this scope
    const useLocalStorage = require('../../../hooks/useLocalStorage').default
    const useCookie = require('../../../hooks/useCookie').default
    const usePersistentStorage =
      require('../../../hooks/usePersistentStorage').default

    renderHook(() => usePersistentStorage('test', ''))

    expect(useCookie).toHaveBeenCalled()
    expect(useLocalStorage).not.toHaveBeenCalled()
  })
})
