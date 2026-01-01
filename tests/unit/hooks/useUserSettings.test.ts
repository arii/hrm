// tests/unit/hooks/useUserSettings.test.ts
import { renderHook, act } from '@testing-library/react-hooks'
import { useUserSettings } from '@/hooks/useUserSettings'

describe('useUserSettings', () => {
  it('should return default values', () => {
    const { result } = renderHook(() => useUserSettings())
    expect(result.current.userName).toBe('Test User')
    expect(result.current.userAge).toBe('30')
    expect(result.current.userGender).toBe('male')
    expect(result.current.unit).toBe('METRIC')
  })

  it('should update user name', () => {
    const { result } = renderHook(() => useUserSettings())
    act(() => {
      result.current.setUserName('New Name')
    })
    expect(result.current.userName).toBe('New Name')
  })

  it('should calculate max HR', () => {
    const { result } = renderHook(() => useUserSettings())
    expect(result.current.maxHr).toBe(190)
    act(() => {
      result.current.setUserAge('40')
    })
    expect(result.current.maxHr).toBe(180)
  })
})
