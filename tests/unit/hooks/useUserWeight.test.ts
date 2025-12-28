/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUserWeight } from '@/hooks/useUserWeight'
import useCookie from '@/hooks/useCookie'

jest.mock('@/hooks/useCookie')

describe('useUserWeight', () => {
  let mockSetValue: jest.Mock

  beforeEach(() => {
    mockSetValue = jest.fn()
  })

  it('should set and get the weight from a cookie', () => {
    ;(useCookie as jest.Mock).mockReturnValue([70, mockSetValue])
    const { result } = renderHook(() => useUserWeight())

    act(() => {
      result.current[1](80)
    })

    expect(mockSetValue).toHaveBeenCalledWith(80)
  })

  it('should return the default weight if the cookie contains a non-numeric value', () => {
    ;(useCookie as jest.Mock).mockReturnValue(['abc', mockSetValue])
    const { result } = renderHook(() => useUserWeight())
    expect(result.current[0]).toBe(70)
  })

  it('should reset the cookie if it contains an invalid value', () => {
    ;(useCookie as jest.Mock).mockReturnValue(['abc', mockSetValue])
    renderHook(() => useUserWeight())
    expect(mockSetValue).toHaveBeenCalledWith(70)
  })
})
