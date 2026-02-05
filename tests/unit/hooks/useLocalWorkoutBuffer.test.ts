/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useLocalWorkoutBuffer } from '@/hooks/useLocalWorkoutBuffer'
import { HrZoneName } from '@/lib/hrm/zones'

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
      [HrZoneName.Idle]: 0,
      [HrZoneName.Recovery]: 0,
      [HrZoneName.WarmUp]: 0,
      [HrZoneName.Aerobic]: 0,
      [HrZoneName.Cardio]: 0,
      [HrZoneName.Peak]: 0,
      [HrZoneName.FatBurn]: 0,
      [HrZoneName.Max]: 0,
      [HrZoneName.NoData]: 0,
      [HrZoneName.Unknown]: 0,
    })
    expect(result.current.lastDataPointTime).toBeNull()
  })

  it('should add HR data correctly and calculate time in zones', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer())
    const maxHr = 190 // Example max HR for zone calculation

    // First data point
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'))
      result.current.addHrData(120, maxHr) // Zone 2
    })

    // Second data point, 2 seconds later
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:02.000Z'))
      result.current.addHrData(150, maxHr) // Zone 3
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

    // The first data point (HR 120 -> 60% -> Warm Up)
    // The second data point (HR 120) adds 2 seconds to Warm Up.
    expect(result.current.timeInZones[HrZoneName.WarmUp]).toBeCloseTo(2)
    expect(result.current.timeInZones[HrZoneName.Cardio]).toBe(0)

    // Third data point, 3 seconds later
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:05.000Z'))
      result.current.addHrData(170, maxHr) // Peak
    })

    // This adds 3 seconds to Aerobic (the zone of the *second* point, 78.9%).
    expect(result.current.timeInZones[HrZoneName.Aerobic]).toBeCloseTo(3)
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
    expect(result.current.timeInZones[HrZoneName.FatBurn]).toBe(0)
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
      [HrZoneName.Idle]: 0,
      [HrZoneName.Recovery]: 0,
      [HrZoneName.WarmUp]: 0,
      [HrZoneName.Aerobic]: 0,
      [HrZoneName.Cardio]: 0,
      [HrZoneName.Peak]: 0,
      [HrZoneName.FatBurn]: 0,
      [HrZoneName.Max]: 0,
      [HrZoneName.NoData]: 0,
      [HrZoneName.Unknown]: 0,
    })
    expect(result.current.lastDataPointTime).toBeNull()
  })
})
