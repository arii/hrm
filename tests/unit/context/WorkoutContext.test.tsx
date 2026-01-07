/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react'
import { WorkoutProvider, useWorkout } from '@/context/WorkoutContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { useWebSocket } from '@/context/WebSocketContext'
import React from 'react'

// Mock the entire WebSocketContext module
jest.mock('@/context/WebSocketContext')
const mockedUseWebSocket = useWebSocket as jest.Mock

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserSettingsProvider>
    <WorkoutProvider>{children}</WorkoutProvider>
  </UserSettingsProvider>
)

describe('context/WorkoutContext', () => {
  const RealDate = Date

  // Helper to mock Date.now() to control time-sensitive logic
  const mockDateNow = (timestamp: number) => {
    const mockDate = new RealDate(timestamp)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate)
    Date.now = jest.fn(() => timestamp)
  }

  // Restore mocks after each test
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    global.Date = RealDate
  })

  it('should initialize with default values', () => {
    mockedUseWebSocket.mockReturnValue({ hrmData: [] })
    const { result } = renderHook(() => useWorkout(), { wrapper })

    expect(result.current.sessionStartTime).toBeNull()
    expect(result.current.workoutDuration).toBe(0)
    expect(result.current.caloriesBurned).toBe(0)
    expect(result.current.buffer).toEqual([])
    expect(result.current.isWorkoutRunning).toBe(false)
  })

  it('should start a workout when hrmData is received', async () => {
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: '1', hr: 100, name: 'Test User' }],
    })
    mockDateNow(1700000000000)

    const { result } = renderHook(() => useWorkout(), { wrapper })

    await waitFor(() => {
      expect(result.current.sessionStartTime).toBe(1700000000000)
      expect(result.current.isWorkoutRunning).toBe(true)
    })
  })

  it('should stop a workout when hrmData becomes empty', async () => {
    // 1. Initial render with active user
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: '1', hr: 100, name: 'Test User' }],
    })
    const { result, rerender } = renderHook(() => useWorkout(), { wrapper })

    // 2. Wait for the workout to be considered running
    await waitFor(() => {
      expect(result.current.isWorkoutRunning).toBe(true)
    })

    // 3. Mock the next WebSocket update to have no users
    mockedUseWebSocket.mockReturnValue({ hrmData: [] })
    rerender() // Trigger a re-render to simulate the context update

    // 4. Wait for the workout to be considered stopped
    await waitFor(() => {
      expect(result.current.isWorkoutRunning).toBe(false)
    })
  })

  it('should buffer hr data and calculate calories over time', async () => {
    // 1. Initial render with first HR data point
    mockDateNow(1700000000000)
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: '1', hr: 120, name: 'Test User' }],
    })
    const { result, rerender } = renderHook(() => useWorkout(), { wrapper })

    // 2. Wait for the first data point to be buffered
    await waitFor(() => {
      expect(result.current.buffer).toHaveLength(1)
    })
    expect(result.current.buffer[0].hr).toBe(120)
    expect(result.current.workoutDuration).toBe(0)

    // 3. Mock time passing and a new HR data point arriving
    mockDateNow(1700000001000) // 1 second later
    mockedUseWebSocket.mockReturnValue({
      hrmData: [{ clientId: '1', hr: 125, name: 'Test User' }],
    })
    rerender()

    // 4. Wait for the buffer and calculations to update
    await waitFor(() => {
      expect(result.current.buffer).toHaveLength(2)
      expect(result.current.workoutDuration).toBe(1)
      expect(result.current.caloriesBurned).toBeCloseTo(0.12, 2)
    })
    expect(result.current.buffer[1].hr).toBe(125)
  })
})
