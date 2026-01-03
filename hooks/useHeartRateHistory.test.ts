/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useHeartRateHistory } from '@/hooks/useHeartRateHistory'

// Mock the visualization utility to control zone calculations in tests
jest.mock('@/utils/visualization', () => ({
  ...jest.requireActual('@/utils/visualization'),
  getHrZoneProps: jest.fn((hr, maxHr) => {
    const percentage = (hr / maxHr) * 100
    if (percentage < 50) return { zone: 'grey' }
    if (percentage < 60) return { zone: 'blue' }
    if (percentage < 70) return { zone: 'green' }
    if (percentage < 80) return { zone: 'yellow' }
    if (percentage < 90) return { zone: 'red' }
    return { zone: 'purple' }
  }),
  ZONE_COLORS: {
    grey: '#9E9E9E',
    blue: '#2196F3',
    green: '#4CAF50',
    yellow: '#FFEB3B',
    red: '#F44336',
    purple: '#9C27B0',
  },
}))

describe('useHeartRateHistory', () => {
  const maxHr = 200

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with empty history and zeroed zone distribution', () => {
    const { result } = renderHook(() => useHeartRateHistory(maxHr))

    expect(result.current.history).toEqual([])
    expect(result.current.zoneDistribution).toEqual({
      grey: 0,
      blue: 0,
      green: 0,
      yellow: 0,
      red: 0,
      purple: 0,
    })
  })

  it('should add heart rate samples to history', () => {
    const { result } = renderHook(() => useHeartRateHistory(maxHr))

    act(() => {
      result.current.addHeartRateSample(120)
    })
    act(() => {
      jest.advanceTimersByTime(1000)
      result.current.addHeartRateSample(125)
    })

    expect(result.current.history.length).toBe(2)
    expect(result.current.history[0].hr).toBe(120)
    expect(result.current.history[1].hr).toBe(125)
  })

  it('should calculate time in each heart rate zone', () => {
    const { result } = renderHook(() => useHeartRateHistory(maxHr))

    act(() => {
      result.current.addHeartRateSample(110) // Zone blue
    })
    act(() => {
      jest.advanceTimersByTime(2000)
      result.current.addHeartRateSample(130) // Zone green
    })
    act(() => {
      jest.advanceTimersByTime(3000)
      result.current.addHeartRateSample(150) // Zone yellow
    })

    expect(result.current.zoneDistribution.blue).toBeCloseTo(2)
    expect(result.current.zoneDistribution.green).toBeCloseTo(3)
    expect(result.current.zoneDistribution.yellow).toBeCloseTo(0) // No time elapsed after last sample
  })

  it('should reset the history and zone distribution', () => {
    const { result } = renderHook(() => useHeartRateHistory(maxHr))

    act(() => {
      result.current.addHeartRateSample(120)
      jest.advanceTimersByTime(1000)
      result.current.addHeartRateSample(125)
    })

    expect(result.current.history.length).toBe(2)
    expect(result.current.zoneDistribution.green).toBeGreaterThan(0)

    act(() => {
      result.current.resetHistory()
    })

    expect(result.current.history).toEqual([])
    expect(result.current.zoneDistribution).toEqual({
      grey: 0,
      blue: 0,
      green: 0,
      yellow: 0,
      red: 0,
      purple: 0,
    })
  })
})
