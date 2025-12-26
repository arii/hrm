/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useCalorieCounter.test.ts
import { renderHook, act } from '@testing-library/react'
import { useCalorieCounter } from '@/hooks/useCalorieCounter'

describe('useCalorieCounter', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should correctly calculate calories for a male user', () => {
    const userProfile = { age: 30, weight: 75, gender: 'male' as const }
    const { result } = renderHook(() => useCalorieCounter(userProfile))

    act(() => {
      result.current.addReading(150)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.addReading(150)
    })

    expect(result.current.totalCalories).toBeGreaterThan(0)
  })

  it('should correctly calculate calories for a female user', () => {
    const userProfile = { age: 30, weight: 65, gender: 'female' as const }
    const { result } = renderHook(() => useCalorieCounter(userProfile))

    act(() => {
      result.current.addReading(150)
    })

    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.addReading(150)
    })

    expect(result.current.totalCalories).toBeGreaterThan(0)
  })
})
