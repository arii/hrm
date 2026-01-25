/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useLocalWorkoutBuffer.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useLocalWorkoutBuffer,
  ActiveWorkoutInputStatus,
} from '@/app/client/experimental/useLocalWorkoutBuffer'
import { useUserSettings } from '@/context/UserSettingsContext'
import { HrZoneName } from '@/utils/hr-zones'

// Mock the useUserSettings hook
jest.mock('@/context/UserSettingsContext')

// Mock useLocalStorage to behave like useState for testing logic
jest.mock('@/hooks/useLocalStorage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useState } = require('react')
  return {
    __esModule: true,
    default: <T,>(_key: string, initialValue: T) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [state, setState] = useState(initialValue)
      return [state, setState]
    },
  }
})

describe('useLocalWorkoutBuffer', () => {
  const mockUseUserSettings = useUserSettings as jest.Mock

  beforeEach(() => {
    mockUseUserSettings.mockReturnValue([
      { userAge: 30, userWeight: 70 },
      () => {},
    ])
  })

  it('should initialize with default data', () => {
    const { result } = renderHook(() =>
      useLocalWorkoutBuffer(0, 'idle' as ActiveWorkoutInputStatus)
    )
    expect(result.current.workoutData.status).toBe('idle')
    expect(result.current.workoutData.hrHistory).toHaveLength(0)
  })

  it('should start a workout when status changes to running', () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: ActiveWorkoutInputStatus }) =>
        useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')
    expect(result.current.workoutData.startTime).not.toBeNull()
  })

  it('should record HR data when running', async () => {
    jest.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ hr, status }: { hr: number; status: ActiveWorkoutInputStatus }) =>
        useLocalWorkoutBuffer(hr, status),
      { initialProps: { hr: 0, status: 'idle' } }
    )

    act(() => {
      rerender({ hr: 120, status: 'running' })
    })

    await waitFor(() => {
      expect(result.current.workoutData.status).toBe('running')
    })

    // Advance time in steps to allow state updates to settle
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }

    expect(result.current.workoutData.hrHistory).toHaveLength(3)
    expect(result.current.workoutData.hrHistory[0]?.hr).toBe(120)
    expect(result.current.workoutData.timeInZones[HrZoneName.FatBurn]).toBe(3)
    jest.useRealTimers()
  })

  it('should pause and resume a workout', () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: ActiveWorkoutInputStatus }) =>
        useLocalWorkoutBuffer(0, status),
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

  it('should pause a workout when status changes to idle', () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: ActiveWorkoutInputStatus }) =>
        useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')

    act(() => {
      rerender({ status: 'idle' })
    })
    expect(result.current.workoutData.status).toBe('paused')
    expect(result.current.workoutData.endTime).toBeNull()
  })

  it('should reset workout data', () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: ActiveWorkoutInputStatus }) =>
        useLocalWorkoutBuffer(0, status),
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

  it('should record HR data even if the initial HR is 0', async () => {
    jest.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ hr, status }) => useLocalWorkoutBuffer(hr, status),
      { initialProps: { hr: 0, status: 'idle' } }
    )

    act(() => {
      rerender({ hr: 0, status: 'running' })
    })

    await waitFor(() => {
      expect(result.current.workoutData.status).toBe('running')
    })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.workoutData.hrHistory).toHaveLength(1)
    expect(result.current.workoutData.hrHistory[0]?.hr).toBe(0)
    expect(result.current.workoutData.timeInZones[HrZoneName.NoData]).toBe(1)

    rerender({ hr: 120, status: 'running' })

    act(() => {
      jest.advanceTimersByTime(1000)
    })

    expect(result.current.workoutData.hrHistory).toHaveLength(2)
    expect(result.current.workoutData.hrHistory[1]?.hr).toBe(120)
    expect(result.current.workoutData.timeInZones[HrZoneName.FatBurn]).toBe(1)

    jest.useRealTimers()
  it('should end a workout', () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: ActiveWorkoutInputStatus }) =>
        useLocalWorkoutBuffer(0, status),
      { initialProps: { status: 'idle' } }
    )
    act(() => {
      rerender({ status: 'running' })
    })
    expect(result.current.workoutData.status).toBe('running')

    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.workoutData.status).toBe('finished')
    expect(result.current.workoutData.endTime).not.toBeNull()
  })
})
