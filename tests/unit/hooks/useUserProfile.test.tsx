/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUserProfile } from '@/hooks/useUserProfile'

describe('useUserProfile', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useUserProfile())
    expect(result.current.userName).toBe('')
    expect(result.current.userAge).toBe('')
    expect(result.current.userHeight).toBe('')
    expect(result.current.gender).toBe('MALE')
    expect(result.current.unitSystem).toBe('IMPERIAL')
  })

  it('should update user name', () => {
    const { result } = renderHook(() => useUserProfile())
    act(() => {
      result.current.setUserName('John Doe')
    })
    expect(result.current.userName).toBe('John Doe')
  })

  it('should handle weight conversion correctly', () => {
    const { result } = renderHook(() => useUserProfile())

    // Initial display weight (70kg in lbs)
    expect(result.current.displayWeight).toBe('154.3')

    act(() => {
      result.current.handleWeightChange('160')
    })

    act(() => {
      result.current.handleWeightBlur()
    })

    expect(result.current.displayWeight).toBe('160')

    act(() => {
      result.current.handleUnitChange('METRIC')
    })

    // After switching to METRIC, the weight should be displayed in kg
    expect(result.current.displayWeight).toBe('72.6')
  })
}, 'useUserProfile-hook-test')
