/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUserWeight } from '@/hooks/useUserWeight'

describe('useUserWeight', () => {
  it('should set and get the weight from a cookie', () => {
    const { result } = renderHook(() => useUserWeight())

    act(() => {
      result.current[1](80)
    })

    expect(result.current[0]).toBe(80)
    expect(document.cookie).toBe('hrm-user-weight=80')
  })
})
