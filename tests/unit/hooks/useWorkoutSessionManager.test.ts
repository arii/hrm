/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSessionManager } from '@/hooks/useWorkoutSessionManager'
import * as WebSocketContext from '@/context/WebSocketContext'
import { workoutSessionStorage } from '@/lib/workout-session-storage'

// Mock the WebSocket context
jest.mock('@/context/WebSocketContext')
jest.mock('@/lib/workout-session-storage')

describe('useWorkoutSessionManager', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()

    // Mock WebSocket context
    jest.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue({
      sendData: jest.fn(),
      connectionStatus: 'Connected',
      hrmData: [],
      timerData: {
        phase: 'idle',
        timeRemaining: 0,
        currentRound: 0,
        totalRounds: 0,
      },
      spotifyData: null,
      workoutData: {
        totalCalories: 0,
        workoutDuration: 0,
      },
      lastJsonMessage: null,
    })
  })

  it('should be in the "idle" state initially', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    expect(result.current.status).toBe('idle')
  })

  it('should transition to the "running" state when onStartWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 80)
    })

    expect(result.current.status).toBe('running')
  })

  it('should transition back to the "idle" state when onEndWorkout is called', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 80)
    })

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.status).toBe('finished')
  })

  it('should reset the session when resetWorkout is called', async () => {
    const { result } = renderHook(() => useWorkoutSessionManager())

    act(() => {
      result.current.startWorkout(30, 80)
    })

    // Ensure session is not null before resetting
    expect(result.current.session).not.toBeNull()

    await act(async () => {
      await result.current.resetWorkout()
    })

    expect(workoutSessionStorage.deleteSession).toHaveBeenCalledWith(
      expect.any(String)
    )
    expect(result.current.session).toBeNull()
    expect(result.current.status).toBe('idle')
  })
})
