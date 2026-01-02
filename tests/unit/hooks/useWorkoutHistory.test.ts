import { renderHook, act } from '@testing-library/react-hooks'
import { useWorkoutHistory } from '@/hooks/useWorkoutHistory'

describe('useWorkoutHistory', () => {
  it('should initialize with empty history and zone distribution', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    expect(result.current.history).toEqual([])
    expect(result.current.zoneDistribution).toEqual([])
  })

  it('should add data points and update history and zone distribution', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    act(() => {
      result.current.addDataPoint(100, 50)
    })
    act(() => {
      result.current.addDataPoint(120, 60)
    })
    expect(result.current.history).toHaveLength(2)
    expect(result.current.history[0]).toEqual({
      time: 1,
      hr: 100,
      calories: 50,
    })
    expect(result.current.zoneDistribution).not.toEqual([])
  })

  it('should reset the history and zone distribution', () => {
    const { result } = renderHook(() => useWorkoutHistory(190))
    act(() => {
      result.current.addDataPoint(100, 50)
    })
    act(() => {
      result.current.resetHistory()
    })
    expect(result.current.history).toEqual([])
    expect(result.current.zoneDistribution).toEqual([])
  })
})
