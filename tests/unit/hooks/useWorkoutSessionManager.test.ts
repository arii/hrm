/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '@/lib/workout-session-storage'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'

jest.mock('@/lib/workout-session-storage')
jest.mock('@/hooks/useAppSnackbar')

describe('useWorkoutSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAppSnackbar as jest.Mock).mockReturnValue({
      showInfo: jest.fn(),
    })
    ;(
      workoutSessionStorage.getIncompleteSession as jest.Mock
    ).mockResolvedValue(null)
  })

  it('starts a workout session', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    // Wait for initialization
    await act(async () => {
      // Small delay to allow useEffect to run
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.startWorkout(30, 70)
    })

    expect(result.current.status).toBe('running')
    expect(result.current.session).toBeDefined()
    expect(result.current.session?.userSettings.age).toBe(30)
  })

  it('adds heart rate data to session', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.addHrData({ time: Date.now(), hr: 120 })
    })

    expect(result.current.session?.hrHistory).toHaveLength(1)
    expect(result.current.session?.hrHistory[0].hr).toBe(120)
  })

  it('ends and resets a workout session', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.startWorkout(30, 70)
    })

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.status).toBe('paused') // transition status in reducer

    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.status).toBe('finished')

    await act(async () => {
      await result.current.resetWorkout()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.session).toBeNull()
  })
})
