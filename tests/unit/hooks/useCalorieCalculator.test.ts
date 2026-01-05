import { act, renderHook } from '@testing-library/react'
import useCalorieCalculator from '@/hooks/useCalorieCalculator'
import * as CalorieEstimation from '@/lib/calorie-estimation'
import { HrmData } from '@/types'

// Mock the calorie estimation module
jest.mock('@/lib/calorie-estimation', () => ({
  __esModule: true,
  estimateCaloriesBurned: jest.fn(),
}))

// Get a reference to the mocked function
const mockedEstimateCaloriesBurned =
  CalorieEstimation.estimateCaloriesBurned as jest.Mock

describe('useCalorieCalculator', () => {
  const mockUserData = { userAge: 30, userWeight: 70, maxHr: 190 }

  beforeEach(() => {
    // Reset mocks before each test
    mockedEstimateCaloriesBurned.mockClear().mockReturnValue(1.5) // Returns 1.5 calories per interval
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks() // Use clearAllMocks to be safe
  })

  it('should initialize with zero calories', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ isRunning: false, userData: mockUserData })
    )
    expect(result.current.totalCalories).toBe(0)
  })

  it('should not calculate calories if isRunning is false', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ isRunning: false, userData: mockUserData })
    )
    const hrmData: HrmData = {
      heartRate: 150,
      rrIntervals: [],
      contactStatus: 'contact',
    }
    act(() => {
      result.current.processHeartRate(hrmData)
      jest.advanceTimersByTime(5000)
    })
    expect(mockedEstimateCaloriesBurned).not.toHaveBeenCalled()
    expect(result.current.totalCalories).toBe(0)
  })

  it('should not calculate calories if userData is null', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ isRunning: true, userData: null })
    )
    const hrmData: HrmData = {
      heartRate: 150,
      rrIntervals: [],
      contactStatus: 'contact',
    }
    act(() => {
      result.current.processHeartRate(hrmData)
      jest.advanceTimersByTime(5000)
    })
    expect(mockedEstimateCaloriesBurned).not.toHaveBeenCalled()
    expect(result.current.totalCalories).toBe(0)
  })

  it('should process heart rate and accumulate calories over time', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ isRunning: true, userData: mockUserData })
    )
    const hrmData: HrmData = {
      heartRate: 160,
      rrIntervals: [],
      contactStatus: 'contact',
    }

    act(() => {
      result.current.processHeartRate(hrmData)
    })

    // Advance time by 10 seconds (2 intervals of 5 seconds)
    act(() => {
      jest.advanceTimersByTime(10000)
    })

    expect(mockedEstimateCaloriesBurned).toHaveBeenCalledTimes(2)
    expect(result.current.totalCalories).toBe(3) // 1.5 calories * 2
  })

  it('should use smoothed heart rate for calculations', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ isRunning: true, userData: mockUserData })
    )

    // Simulate fluctuating heart rate
    act(() => {
      result.current.processHeartRate({
        heartRate: 100,
        rrIntervals: [],
        contactStatus: 'contact',
      })
      result.current.processHeartRate({
        heartRate: 200,
        rrIntervals: [],
        contactStatus: 'contact',
      })
    })

    act(() => {
      jest.advanceTimersByTime(5000)
    })

    // The smoothed HR should be the average, (100+200)/2 = 150
    expect(mockedEstimateCaloriesBurned).toHaveBeenCalledWith(
      expect.objectContaining({
        avgHr: 150,
      })
    )
  })

  it('should reset calories and internal state', () => {
    const { result } = renderHook(() =>
      useCalorieCalculator({ isRunning: true, userData: mockUserData })
    )
    const hrmData: HrmData = {
      heartRate: 150,
      rrIntervals: [],
      contactStatus: 'contact',
    }

    act(() => {
      result.current.processHeartRate(hrmData)
      jest.advanceTimersByTime(5000)
    })

    expect(result.current.totalCalories).toBe(1.5)

    act(() => {
      result.current.reset()
    })

    expect(result.current.totalCalories).toBe(0)

    // Ensure it doesn't continue calculating after reset
    mockedEstimateCaloriesBurned.mockClear()
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    expect(mockedEstimate.not.toHaveBeenCalled())
  })
})
