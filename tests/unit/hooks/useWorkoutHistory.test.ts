import { renderHook, act } from '@testing-library/react-hooks'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'

const createWorkoutDataPoint = (hr: number, calories: number) => ({
  hr,
  calories,
})

describe('useWorkoutHistory', () => {
  it('should initialize with empty history and zone distribution', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    expect(result.current.history).toEqual([])
    expect(result.current.zoneDistribution).toEqual([])
  })

  it('should add data points and update history and zone distribution', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    const dataPoint1 = createWorkoutDataPoint(100, 50)
    const dataPoint2 = createWorkoutDataPoint(120, 60)

    act(() => {
      result.current.addDataPoint(dataPoint1.hr, dataPoint1.calories)
    })
    act(() => {
      result.current.addDataPoint(dataPoint2.hr, dataPoint2.calories)
    })

    expect(result.current.history).toHaveLength(2)
    expect(result.current.history[0]).toEqual({
      time: 1,
      hr: 100,
      calories: 50,
    })
    expect(result.current.zoneDistribution).not.toEqual([])
    expect(result.current.zoneDistribution[0].zone).toBe('WarmUp')
  })

  it('should reset the history and zone distribution', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    const dataPoint = createWorkoutDataPoint(100, 50)

    act(() => {
      result.current.addDataPoint(dataPoint.hr, dataPoint.calories)
    })
    act(() => {
      result.current.resetHistory()
    })

    expect(result.current.history).toEqual([])
    expect(result.current.zoneDistribution).toEqual([])
  })

  it('should correctly calculate zone percentages', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    const dataPoints = [
      createWorkoutDataPoint(100, 50), // WarmUp
      createWorkoutDataPoint(130, 60), // FatBurn
      createWorkoutDataPoint(130, 70), // FatBurn
      createWorkoutDataPoint(160, 80), // Cardio
    ]

    dataPoints.forEach((point) => {
      act(() => {
        result.current.addDataPoint(point.hr, point.calories)
      })
    })

    const warmUpZone = result.current.zoneDistribution.find(
      (z) => z.zone === 'WarmUp'
    )
    const fatBurnZone = result.current.zoneDistribution.find(
      (z) => z.zone === 'FatBurn'
    )
    const cardioZone = result.current.zoneDistribution.find(
      (z) => z.zone === 'Cardio'
    )

    expect(warmUpZone?.percentage).toBe(25)
    expect(fatBurnZone?.percentage).toBe(50)
    expect(cardioZone?.percentage).toBe(25)
  })
})
