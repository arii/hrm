/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useLocalWorkoutBuffer.test.tsx
import { renderHook, act } from '@testing-library/react'
import { useLocalWorkoutBuffer } from '@/app/client/experimental/useLocalWorkoutBuffer'
import { useUserSettings } from '@/context/UserSettingsContext'
import { HrZoneName } from '@/utils/hr-zones'

// Mock the useUserSettings hook
jest.mock('@/context/UserSettingsContext')

describe('useLocalWorkoutBuffer', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock

  beforeEach(() => {
    mockUseUserSettings.mockReturnValue([
      { userAge: 30, userWeight: 70 },
      () => {},
    ])
  })

  it('should initialize with default data', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(0, 'idle'))
    expect(result.current.workoutData.status).toBe('idle')
    expect(result.current.workoutData.hrHistory).toHaveLength(0)
  })

  it('should start a workout when status changes to running', () => {
    const { result, rerender } = renderHook(
      ({ status }) => useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')
    expect(result.current.workoutData.startTime).not.toBeNull()
  })

  it('should record HR data when running', () => {
    jest.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ hr, status }) => useLocalWorkoutBuffer(hr, status),
      { initialProps: { hr: 0, status: 'idle' } }
    )

    act(() => {
      rerender({ hr: 120, status: 'running' })
    })

    act(() => {
      jest.advanceTimersByTime(3000)
    })

    expect(result.current.workoutData.hrHistory).toHaveLength(3)
    expect(result.current.workoutData.hrHistory[0]?.hr).toBe(120)
    expect(result.current.workoutData.timeInZones[HrZoneName.FatBurn]).toBe(3)
    jest.useRealTimers()
  })

  it('should pause and resume a workout', () => {
    const { result, rerender } = renderHook(
      ({ status }) => useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')

    act(() => {
      rerender({ status: 'paused' })
    })
    expect(result.current.workoutData.status).toBe('paused')

    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')
  })

  it('should end a workout when status changes to idle', () => {
    const { result, rerender } = renderHook(
      ({ status }) => useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')

    act(() => {
      rerender({ status: 'idle' })
    })
    expect(result.current.workoutData.status).toBe('finished')
    expect(result.current.workoutData.endTime).not.toBeNull()
  })

  it('should reset workout data', () => {
    const { result, rerender } = renderHook(
      ({ status }) => useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')

    act(() => {
      result.current.resetWorkout()
    })
    expect(result.current.workoutData.status).toBe('idle')
    expect(result.current.workoutData.startTime).toBeNull()
  })
})
