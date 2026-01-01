// tests/unit/hooks/useHrm.test.ts
import { renderHook, act } from '@testing-library/react-hooks'
import { useHrm } from '@/hooks/useHrm'

describe('useHrm', () => {
  it('should return default values', () => {
    const { result } = renderHook(() => useHrm())
    expect(result.current.isConnected).toBe(false)
    expect(result.current.deviceStatus).toBe('Disconnected')
    expect(result.current.isSupported).toBe(true)
  })

  it('should handle connect and disconnect', () => {
    const { result } = renderHook(() => useHrm())
    act(() => {
      result.current.onConnect()
    })
    // Note: In a test environment, navigator.bluetooth is not available,
    // so the onConnect function will immediately set the status to 'Bluetooth not supported'.
    expect(result.current.deviceStatus).toBe('Bluetooth not supported')
  })
})
