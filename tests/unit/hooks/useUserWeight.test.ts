/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useUserWeight } from '@/hooks/useUserWeight'
import useLocalStorage from '@/hooks/useLocalStorage'

// Mock useLocalStorage
jest.mock('@/hooks/useLocalStorage', () => ({
  __esModule: true,
  default: jest.fn(),
}))

describe('useUserWeight', () => {
  it('should return default weight and setter', () => {
    const setStorageMock = jest.fn()
    ;(useLocalStorage as jest.Mock).mockReturnValue(['70', setStorageMock])

    const { result } = renderHook(() => useUserWeight())

    expect(result.current[0]).toBe(70)
    expect(typeof result.current[1]).toBe('function')
  })

  it('should update weight', () => {
    const setStorageMock = jest.fn()
    ;(useLocalStorage as jest.Mock).mockReturnValue(['70', setStorageMock])

    const { result } = renderHook(() => useUserWeight())

    act(() => {
      result.current[1](75)
    })

    expect(setStorageMock).toHaveBeenCalledWith('75')
  })

  it('should handle stored non-numeric values gracefully (NaN)', () => {
    const setStorageMock = jest.fn()
    ;(useLocalStorage as jest.Mock).mockReturnValue(['invalid', setStorageMock])

    const { result } = renderHook(() => useUserWeight())

    expect(result.current[0]).toBeNaN()
  })
})
