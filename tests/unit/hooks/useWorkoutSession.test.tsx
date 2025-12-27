/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useWorkoutSession } from '@/hooks/useWorkoutSession'
import {
  WebSocketContext,
  WebSocketContextType,
} from '@/context/WebSocketContext'
import { ReactNode } from 'react'
import { jest, describe, it, expect, beforeEach } from '@jest/globals'
import { INITIAL_STATE } from '@/context/WebSocketContext' // Assuming INITIAL_STATE is exported or accessible

// 1. Create a mock context value that matches WebSocketContextType
const mockSendData = jest.fn()
const mockConnect = jest.fn()
const mockDisconnect = jest.fn()

const mockContextValue: WebSocketContextType = {
  ...INITIAL_STATE, // Use the same initial state as the provider
  connectionStatus: 'Connected',
  sendData: mockSendData,
  connect: mockConnect,
  disconnect: mockDisconnect,
}

// 2. Create a wrapper component that provides the mock context
const wrapper = ({ children }: { children: ReactNode }) => (
  <WebSocketContext.Provider value={mockContextValue}>
    {children}
  </WebSocketContext.Provider>
)

describe('useWorkoutSession', () => {
  beforeEach(() => {
    // Clear mock history before each test
    mockSendData.mockClear()
  })

  it('should initialize with zero calories burned', () => {
    const { result } = renderHook(
      () => useWorkoutSession({ isConnected: false, totalCalories: 0 }),
      { wrapper }
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should start with zero calories burned even if totalCalories is non-zero', () => {
    const { result } = renderHook(
      () => useWorkoutSession({ isConnected: false, totalCalories: 100 }),
      { wrapper }
    )
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should capture the starting calorie count on startWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: false, totalCalories }),
      {
        initialProps: { totalCalories: 100 },
        wrapper,
      }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 110 })
    expect(result.current.caloriesBurned).toBe(10)
  })

  it('should calculate calories burned based on the difference from the start', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      {
        initialProps: { totalCalories: 50 },
        wrapper,
      }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 55 })
    expect(result.current.caloriesBurned).toBe(5)

    rerender({ totalCalories: 75 })
    expect(result.current.caloriesBurned).toBe(25)
  })

  it('should not show negative calories if totalCalories decreases', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      {
        initialProps: { totalCalories: 100 },
        wrapper,
      }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 90 }) // totalCalories decreased
    expect(result.current.caloriesBurned).toBe(0)
  })

  it('should preserve the last calculated calories when the workout ends', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      {
        initialProps: { totalCalories: 200 },
        wrapper,
      }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 250 })
    expect(result.current.caloriesBurned).toBe(50)

    act(() => {
      result.current.endWorkout()
    })

    expect(result.current.caloriesBurned).toBe(50)
    rerender({ totalCalories: 260 }) // Further changes should not affect burned calories
    expect(result.current.caloriesBurned).toBe(50)
  })

  it('should send a RESET_CALORIES message with the clientId when the workout ends', () => {
    const { result } = renderHook(
      () =>
        useWorkoutSession({
          isConnected: true,
          totalCalories: 200,
          clientId: 'test-client-id',
        }),
      { wrapper }
    )

    act(() => {
      result.current.startWorkout()
    })

    act(() => {
      result.current.endWorkout()
    })

    // Assert that sendData was called with the correct message
    expect(mockSendData).toHaveBeenCalledTimes(1)
    expect(mockSendData).toHaveBeenCalledWith({
      type: 'RESET_CALORIES',
      clientId: 'test-client-id',
    })
  })

  it('should reset caloriesBurned to zero on resetWorkout', () => {
    const { result, rerender } = renderHook(
      ({ totalCalories }) =>
        useWorkoutSession({ isConnected: true, totalCalories }),
      {
        initialProps: { totalCalories: 300 },
        wrapper,
      }
    )

    act(() => {
      result.current.startWorkout()
    })

    rerender({ totalCalories: 320 })
    expect(result.current.caloriesBurned).toBe(20)

    act(() => {
      result.current.resetWorkout()
    })

    expect(result.current.caloriesBurned).toBe(0)
  })
})
