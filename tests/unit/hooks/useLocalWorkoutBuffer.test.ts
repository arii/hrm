/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useLocalWorkoutBuffer } from '@/hooks/useLocalWorkoutBuffer'

describe('useLocalWorkoutBuffer', () => {
  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  it('should initialize with an empty state', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer())

    expect(result.current.hrHistory).toEqual([])
    expect(result.current.timeInZones).toEqual({
      ZONE_0: 0,
      ZONE_1: 0,
      ZONE_2: 0,
      ZONE_3: 0,
      ZONE_4: 0,
      ZONE_5: 0,
      ZONE_6: 0,
      NO_DATA: 0,
      UNKNOWN: 0,
    })
    expect(result.current.lastDataPointTime).toBeNull()
  })

  it('should add HR data correctly and calculate time in zones', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer())
    const maxHr = 190 // Example max HR for zone calculation

    // First data point
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'))
      result.current.addHrData(120, maxHr) // 63% -> Zone 2
    })

    // Second data point, 2 seconds later
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:02.000Z'))
      result.current.addHrData(150, maxHr) // 78% -> Zone 3
    })

    expect(result.current.hrHistory).toHaveLength(2)
    expect(result.current.hrHistory[0]).toEqual({
      time: expect.any(Number),
      hr: 120,
    })
    expect(result.current.hrHistory[1]).toEqual({
      time: expect.any(Number),
      hr: 150,
    })

    // The first data point (HR 120 -> 63% -> Zone 2)
    // The second data point (HR 120) adds 2 seconds to Zone 2.
    expect(result.current.timeInZones.ZONE_2).toBeCloseTo(2)
    expect(result.current.timeInZones.ZONE_3).toBe(0)

    // Third data point, 3 seconds later
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:05.000Z'))
      result.current.addHrData(170, maxHr) // 89% -> Zone 4
    })

    // This adds 3 seconds to Zone 3 (the zone of the *second* point, 78.9%).
    expect(result.current.timeInZones.ZONE_3).toBeCloseTo(3)
  })

  it('should not add data if the time delta is too large (greater than 10s)', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer())
    const maxHr = 190

    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'))
      result.current.addHrData(120, maxHr)
    })

    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:15.000Z')) // 15 seconds later
      result.current.addHrData(130, maxHr)
    })

    // History should have 2 points, but zone time should not have been added for the gapped data.
    expect(result.current.hrHistory).toHaveLength(2)
    expect(result.current.timeInZones.ZONE_3).toBe(0)
  })

  it('should reset the buffer to its initial state', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer())
    const maxHr = 190

    act(() => {
      jest.setSystemTime(new Date())
      result.current.addHrData(120, maxHr)
    })

    act(() => {
      jest.advanceTimersByTime(2000)
      result.current.addHrData(130, maxHr)
    })

    expect(result.current.hrHistory).not.toEqual([])

    act(() => {
      result.current.resetBuffer()
    })

    expect(result.current.hrHistory).toEqual([])
    expect(result.current.timeInZones).toEqual({
      ZONE_0: 0,
      ZONE_1: 0,
      ZONE_2: 0,
      ZONE_3: 0,
      ZONE_4: 0,
      ZONE_5: 0,
      ZONE_6: 0,
      NO_DATA: 0,
      UNKNOWN: 0,
    })
    expect(result.current.lastDataPointTime).toBeNull()
  })
})
