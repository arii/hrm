/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { mockEstimateCaloriesBurned } from '../../mocks/calorie-estimation'
import { useCalorieCalculator } from '../../../hooks/useCalorieCalculator'

jest.useFakeTimers()

describe('useCalorieCalculator', () => {
  afterEach(() => {
    mockEstimateCaloriesBurned.mockReset()
    jest.clearAllTimers()
  })

  it('should initialize with 0 calories', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 75 })
    )
    expect(result.current.calories).toBe(0)
  })

  it('should not calculate calories if HR is not processed', () => {
    renderHook(() => useCalorieCalculator({ age: 30, weightKg: 75 }))
    expect(mockEstimateCaloriesBurned).not.toHaveBeenCalled()
  })

  it('should process heart rate and accumulate calories over time', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 75 })
    )

    mockEstimateCaloriesBurned.mockReturnValue(1) // Mock return value

    act(() => {
      result.current.processHeartRate(120)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(125)
    })

    expect(result.current.calories).toBeGreaterThan(0)
    expect(mockEstimateCaloriesBurned).toHaveBeenCalledTimes(1)
  })

  it('should use smoothed heart rate for calculations', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 75, smoothingWindow: 3 })
    )

    mockEstimateCaloriesBurned.mockImplementation(({ heartRate }) => {
      return heartRate
    })

    act(() => {
      result.current.processHeartRate(100)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(110)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(120)
    })

    const expectedSmoothedHr = (100 + 110 + 120) / 3
    const lastCall =
      mockEstimateCaloriesBurned.mock.calls[
        mockEstimateCaloriesBurned.mock.calls.length - 1
      ][0]
    expect(lastCall.heartRate).toBeCloseTo(expectedSmoothedHr)
  })

  it('should reset calories and internal state', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ age: 30, weightKg: 75 })
    )

    mockEstimateCaloriesBurned.mockReturnValue(1)

    act(() => {
      result.current.processHeartRate(120)
      jest.advanceTimersByTime(1000)
      result.current.processHeartRate(125)
    })

    expect(result.current.calories).toBeGreaterThan(0)

    act(() => {
      result.current.reset()
    })

    expect(result.current.calories).toBe(0)

    act(() => {
      result.current.processHeartRate(130)
    })

    // After reset, the first processHeartRate should not calculate calories
    // as there's no previous timestamp.
    expect(mockEstimateCaloriesBurned).toHaveBeenCalledTimes(1)
  })
})
