/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useWorkoutSessionManager.test.ts

import { renderHook, act } from '@testing-library/react'
import { useWorkoutSessionManager } from '../../../hooks/useWorkoutSessionManager'
import { workoutSessionStorage } from '../../../lib/workout-session-storage'

// Mock the storage module
jest.mock('../../../lib/workout-session-storage', () => ({
  workoutSessionStorage: {
    getIncompleteSession: jest.fn(),
    saveSession: jest.fn(),
    deleteSession: jest.fn(),
  },
}))

describe('useWorkoutSessionManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize and check for incomplete sessions', async () => {
    (workoutSessionStorage.getIncompleteSession as jest.Mock).mockResolvedValueOnce(null)
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    expect(result.current.isInitialized).toBe(true)
    expect(result.current.session).toBeNull()
  })

  it('should recover an incomplete session', async () => {
    const mockSession = { sessionId: 'incomplete-session', status: 'paused' }
    ;(workoutSessionStorage.getIncompleteSession as jest.Mock).mockResolvedValueOnce(mockSession)
    const { result } = renderHook(() => useWorkoutSessionManager())

    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })

    expect(result.current.session).toEqual(mockSession)
    expect(result.current.status).toBe('paused')
  })

  it('should start a new workout', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    act(() => {
      result.current.startWorkout(30, 70)
    })
    expect(result.current.status).toBe('running')
    expect(result.current.session).not.toBeNull()
    expect(result.current.session?.sessionId).toBeDefined()
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
    const { result } = renderHook(() => useWorkoutSessionManager())
    act(() => {
      result.current.startWorkout(30, 70)
    })
    await act(async () => {
      await result.current.resetWorkout()
    })
    expect(result.current.session).toBeNull()
    expect(result.current.status).toBe('idle')
    expect(workoutSessionStorage.deleteSession).toHaveBeenCalled()
  })

  it('should calculate time in zones correctly', () => {
    const { result } = renderHook(() => useWorkoutSessionManager())
    const age = 30;
    const maxHr = 208 - 0.7 * age; // ~187

    act(() => {
      result.current.startWorkout(age, 70, maxHr)
    })

    // Zone 2: 60-70% of max HR (112-131)
    act(() => {
      result.current.addHrData({ time: Date.now(), hr: 120 })
    })

    act(() => {
      result.current.addHrData({ time: Date.now() + 1000, hr: 125 })
    })

    // Zone 3: 70-80% of max HR (131-149)
    act(() => {
      result.current.addHrData({ time: Date.now() + 2000, hr: 140 })
    })

    expect(result.current.session?.timeInZones['Zone 2']).toBeCloseTo(1)
    expect(result.current.session?.timeInZones['Zone 3']).toBeCloseTo(1)

  })
})
