/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useLocalWorkoutBuffer.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLocalWorkoutBuffer } from '@/hooks/useLocalWorkoutBuffer'
import { useUserSettings } from '@/context/UserSettingsContext'

// Mock the context
jest.mock('@/context/UserSettingsContext', () => ({
  useUserSettings: jest.fn(),
}))

describe('useLocalWorkoutBuffer', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    ;(useUserSettings as jest.Mock).mockReturnValue([{ userAge: 30 }, () => {}])
    localStorage.clear()
    // Use fake timers to control setInterval
    jest.useFakeTimers()
  })

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers()
  })

  it('should not buffer data when the workout is not running', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(120, 'idle'))
    expect(result.current.buffer).toEqual([])
  })

  it('should buffer data while running and stop when idle', () => {
    // Initial render with 'running' status
    const { result, rerender } = renderHook(
      ({ status, hr }) => useLocalWorkoutBuffer(hr, status),
      { initialProps: { status: 'running', hr: 120 } }
    )

    // Advance time by 2 seconds, expecting 2 data points
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current.buffer.length).toBe(2)
    expect(result.current.buffer[0].hr).toBe(120)

    // Rerender the hook with 'idle' status to stop the interval
    rerender({ status: 'idle', hr: 120 })

    // Advance time again; the buffer should not grow
    act(() => {
      jest.advanceTimersByTime(2000)
    })
    expect(result.current.buffer.length).toBe(2)
  })

  it('should clear the buffer when clearBuffer is called', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(120, 'running'))

    // Add some data to the buffer
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    expect(result.current.buffer.length).toBe(1)

    // Clear the buffer
    act(() => {
      result.current.clearBuffer()
    })

    expect(result.current.buffer).toEqual([])
  })
})
