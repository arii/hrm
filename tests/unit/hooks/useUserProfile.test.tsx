/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useUserProfile } from '@/hooks/useUserProfile'

describe('useUserProfile', () => {
  afterEach(() => {
    localStorage.clear()
  })

  it('should initialize with default values when localStorage is empty', () => {
    const { result } = renderHook(() => useUserProfile())
    expect(result.current.userName).toBe('')
    expect(result.current.userAge).toBe('')
    expect(result.current.userHeight).toBe('')
    expect(result.current.gender).toBe('MALE')
    expect(result.current.unitSystem).toBe('IMPERIAL')
    expect(result.current.displayWeight).toBe('154.3') // 70kg in lbs
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

  it('should not update weight on invalid input', () => {
    const { result } = renderHook(() => useUserProfile())

    act(() => {
        result.current.handleWeightChange('abc')
    })

    act(() => {
        result.current.handleWeightBlur()
    })

    expect(result.current.displayWeight).toBe('abc')
  })

  it('should handle different combinations of weight and unit systems', () => {
    // Set initial values in localStorage
    localStorage.setItem('hrm-user-weight', JSON.stringify('80'))
    localStorage.setItem('hrm-user-units', JSON.stringify('METRIC'))

    const { result } = renderHook(() => useUserProfile())

    expect(result.current.displayWeight).toBe('80')

    act(() => {
      result.current.handleUnitChange('IMPERIAL')
    })

    expect(result.current.displayWeight).toBe('176.4')
  })
}, 'useUserProfile-hook-test')
