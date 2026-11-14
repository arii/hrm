/**
 * @jest-environment jsdom
 */

import { useConnectionOwnership } from '@/hooks/useBluetoothHRM/useConnectionOwnership'
import { renderHook, act } from '@testing-library/react'

describe('useConnectionOwnership', () => {
  it('starts with token 0, no attempt recorded, and clear guard flags', () => {
    const { result } = renderHook(() => useConnectionOwnership())

    expect(result.current.connectionAttempted).toBe(false)
    expect(result.current.connectionAttemptRef.current).toBe(0)
    expect(result.current.isConnecting.current).toBe(false)
    expect(result.current.isManualDisconnect.current).toBe(false)
    expect(result.current.isTimeoutDisconnect.current).toBe(false)
    expect(result.current.isUnmountedRef.current).toBe(false)
  })

  it('increments the ownership token on every claim', () => {
    const { result } = renderHook(() => useConnectionOwnership())

    act(() => result.current.claimConnectionAttempt())
    expect(result.current.connectionAttemptRef.current).toBe(1)

    act(() => result.current.claimConnectionAttempt())
    expect(result.current.connectionAttemptRef.current).toBe(2)
  })

  it('keeps guard flags writable by the owning operation', () => {
    const { result } = renderHook(() => useConnectionOwnership())

    act(() => {
      result.current.isManualDisconnect.current = true
      result.current.isTimeoutDisconnect.current = true
      result.current.isConnecting.current = true
      result.current.isUnmountedRef.current = true
    })

    expect(result.current.isManualDisconnect.current).toBe(true)
    expect(result.current.isTimeoutDisconnect.current).toBe(true)
    expect(result.current.isConnecting.current).toBe(true)
    expect(result.current.isUnmountedRef.current).toBe(true)
  })
})
