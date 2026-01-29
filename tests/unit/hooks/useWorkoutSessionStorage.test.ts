// tests/unit/hooks/useWorkoutSessionStorage.test.ts
/** @jest-environment jsdom */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSessionStorage } from '@/hooks/useWorkoutSessionStorage'
import { useUserSettings } from '@/context/UserSettingsContext'
import useLocalStorage from '@/hooks/useLocalStorage'
import { WorkoutSessionData } from '@/lib/sessionDataValidator'

// Mock dependencies
jest.mock('@/hooks/useLocalStorage')
jest.mock('@/context/UserSettingsContext')

const mockedUseLocalStorage = useLocalStorage as jest.Mock
const mockedUseUserSettings = useUserSettings as jest.Mock

const MOCK_SESSION_ID = 'workout_123456789'
const mockRunningSession: WorkoutSessionData = {
  id: MOCK_SESSION_ID,
  startTime: Date.now(),
  endTime: null,
  status: 'running',
  hrHistory: [],
  calorieHistory: [],
  timeInZones: {} as any,
  schemaVersion: 1,
}

describe('useWorkoutSessionStorage', () => {
  let setStoredSessions: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    setStoredSessions = jest.fn()
    mockedUseUserSettings.mockReturnValue([{ userAge: 30, isMale: true }])
    // Default mock: starts with empty storage
    mockedUseLocalStorage.mockReturnValue([[], setStoredSessions])
  })

  it('initializes with no active session when storage is empty', () => {
    const { result } = renderHook(() => useWorkoutSessionStorage())
    expect(result.current.activeSession).toBeNull()
    expect(result.current.allSessions).toEqual([])
  })

  it('loads an unfinished session from storage as active on mount', () => {
    mockedUseLocalStorage.mockReturnValue([
      [mockRunningSession],
      setStoredSessions,
    ])
    const { result } = renderHook(() => useWorkoutSessionStorage())
    expect(result.current.activeSession).not.toBeNull()
    expect(result.current.activeSession?.id).toBe(MOCK_SESSION_ID)
    expect(result.current.allSessions.length).toBe(1)
  })

  it('starts a new workout', () => {
    const { result } = renderHook(() => useWorkoutSessionStorage())
    act(() => {
      result.current.startNewWorkout()
    })
    expect(result.current.activeSession).not.toBeNull()
    expect(result.current.activeSession?.status).toBe('running')
    expect(result.current.allSessions.length).toBe(1)
    expect(setStoredSessions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ status: 'running' }),
      ])
    )
  })

  it('ends an active workout', () => {
    const { result } = renderHook(() => useWorkoutSessionStorage())
    act(() => {
      result.current.startNewWorkout()
    })
    act(() => {
      result.current.endWorkout()
    })
    expect(result.current.activeSession).toBeNull()
    const session = result.current.allSessions[0]
    expect(session.status).toBe('finished')
    expect(session.endTime).not.toBeNull()
    expect(setStoredSessions).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ status: 'finished' }),
      ])
    )
  })

  it('pauses and resumes a workout', () => {
    const { result } = renderHook(() => useWorkoutSessionStorage())
    act(() => result.current.startNewWorkout())
    expect(result.current.activeSession?.status).toBe('running')

    act(() => result.current.pauseWorkout())
    expect(result.current.activeSession?.status).toBe('paused')
    expect(setStoredSessions).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ status: 'paused' })])
    )

    act(() => result.current.resumeWorkout())
    expect(result.current.activeSession?.status).toBe('running')
    expect(setStoredSessions).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ status: 'running' })])
    )
  })

  it('records a data point for a running workout', () => {
    const { result } = renderHook(() => useWorkoutSessionStorage())
    act(() => result.current.startNewWorkout())
    act(() => result.current.recordDataPoint(150, 5))

    const session = result.current.activeSession
    expect(session?.hrHistory.length).toBe(1)
    expect(session?.calorieHistory.length).toBe(1)
    expect(session?.hrHistory[0].hr).toBe(150)
  })

  it('does not record a data point for a paused workout', () => {
    const { result } = renderHook(() => useWorkoutSessionStorage())
    act(() => result.current.startNewWorkout())
    act(() => result.current.pauseWorkout())
    act(() => result.current.recordDataPoint(150, 5))

    expect(result.current.activeSession?.hrHistory.length).toBe(0)
  })

  it('deletes a session', () => {
    mockedUseLocalStorage.mockReturnValue([
      [mockRunningSession],
      setStoredSessions,
    ])
    const { result } = renderHook(() => useWorkoutSessionStorage())
    expect(result.current.allSessions.length).toBe(1)

    act(() => result.current.deleteSession(MOCK_SESSION_ID))

    expect(result.current.allSessions.length).toBe(0)
    expect(result.current.activeSession).toBeNull()
    expect(setStoredSessions).toHaveBeenCalledWith([])
  })
})
