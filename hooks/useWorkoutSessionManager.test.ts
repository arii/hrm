import { act, renderHook } from '@testing-library/react-hooks'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../lib/workout-session-storage'

jest.mock('../lib/workout-session-storage', () => ({
  workoutSessionStorage: {
    getIncompleteSession: jest.fn(),
    saveSession: jest.fn(),
    deleteSession: jest.fn(),
  },
}))

describe('useWorkoutSessionManager', () => {
  it('should start a workout', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 70)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.session).not.toBeNull()
  })

  it('should pause and resume a workout', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.pauseWorkout()
    })

    expect(result.current.status).toBe('paused')

    act(() => {
      result.current.resumeWorkout()
    })

    expect(result.current.status).toBe('running')
  })

  it('should end a workout', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.status).toBe('finished')
  })

  it('should reset a workout', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 70)
    })

    await act(async () => {
      result.current.resetWorkout()
      await waitForNextUpdate()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.session).toBeNull()
  })

  it('should add HR data to the session', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.addHrData({ time: Date.now(), hr: 120 })
    })

    expect(result.current.session?.hrHistory).toHaveLength(1)
  })

  it('should recover an incomplete session', async () => {
    const incompleteSession = { sessionId: '123', status: 'running' }
    ;(workoutSessionStorage.getIncompleteSession as jest.Mock).mockResolvedValue(incompleteSession)

    const { result, waitForNextUpdate } = renderHook(() => useWorkoutSessionManager())

    await waitForNextUpdate()

    expect(result.current.session).toEqual(incompleteSession)
    expect(result.current.status).toBe('running')
  })
})
