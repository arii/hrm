/**
 * @jest-environment jsdom
 */
// tests/unit/hooks/useLocalWorkoutBuffer.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLocalWorkoutBuffer } from '@/hooks/useLocalWorkoutBuffer'
import { useUserSettings } from '@/context/UserSettingsContext'

jest.mock('@/context/UserSettingsContext', () => ({
  useUserSettings: jest.fn(),
}))

describe('useLocalWorkoutBuffer', () => {
  beforeEach(() => {
    ;(useUserSettings as jest.Mock).mockReturnValue([{ userAge: 30 }, () => {}])
    localStorage.clear()
  })

  it('should not buffer data when the workout is not running', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(120, 'idle'))
    expect(result.current.buffer).toEqual([])
  })

  it('should buffer data when the workout is running', async () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(120, 'running'))

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1100))
    })

    expect(result.current.buffer.length).toBe(1)
    expect(result.current.buffer[0].hr).toBe(120)
  })

  it('should clear the buffer', () => {
    const { result } = renderHook(() => useLocalWorkoutBuffer(120, 'running'))

    act(() => {
      result.current.clearBuffer()
    })

    expect(result.current.buffer).toEqual([])
  })
})
