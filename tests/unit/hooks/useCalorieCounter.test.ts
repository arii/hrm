/**
 * @jest-environment jsdom
 */
import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'
import { UserPhysicalProfileProvider } from '@/context/UserPhysicalProfileContext'
import * as calorieEstimation from '@/lib/calorie-estimation'

jest.mock('@/lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}))

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <UserPhysicalProfileProvider>{children}</UserPhysicalProfileProvider>
)

describe('useCalorieCounter', () => {
  beforeEach(() => {
    // Enable fake timers
    jest.useFakeTimers()
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should calculate calories correctly over time', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, true), {
      wrapper,
    })

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    // After 1 second, we should have 1 calorie (1 call to estimate * 1 returned)
    expect(result.current.calories).toBe(1)
    expect(calorieEstimation.estimateCaloriesBurned).toHaveBeenCalledTimes(1)

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    // After 2 more seconds, total 3 calories
    expect(result.current.calories).toBe(3)
    expect(calorieEstimation.estimateCaloriesBurned).toHaveBeenCalledTimes(3)
  })

  it('should not calculate calories when isActive is false', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, false), {
      wrapper,
    })

    expect(result.current.calories).toBe(0)

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.calories).toBe(0)
    expect(calorieEstimation.estimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should reset calories when resetCalories is called', () => {
    ;(calorieEstimation.estimateCaloriesBurned as jest.Mock).mockReturnValue(1)
    const { result } = renderHook(() => useCalorieCounter(120, true), {
      wrapper,
    })

    act(() => {
      jest.advanceTimersByTime(2000)
    })

    expect(result.current.calories).toBe(2)

    act(() => {
      result.current.resetCalories()
    })

    expect(result.current.calories).toBe(0)
  })
})
