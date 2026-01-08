/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useReconnection } from '@/hooks/useReconnection'

jest.useFakeTimers()

describe('useReconnection', () => {
  it('should attempt to reconnect', async () => {
    const onReconnect = jest.fn().mockResolvedValue(undefined)
    const { result } = renderHook(() => useReconnection({ onReconnect }))

    act(() => {
      result.current.startReconnecting('signal_loss')
    })

    await act(async () => {
      jest.advanceTimersByTime(2000)
    })

    expect(onReconnect).toHaveBeenCalled()
  })

  it('should stop reconnecting after max attempts', async () => {
    const onReconnect = jest.fn().mockRejectedValue(new Error('Failed'))
    const { result } = renderHook(() =>
      useReconnection({ onReconnect, maxAttempts: 2 })
    )

    act(() => {
      result.current.startReconnecting('signal_loss')
    })

    await act(async () => {
      jest.advanceTimersByTime(2000)
    })
    expect(onReconnect).toHaveBeenCalledTimes(1)

    await act(async () => {
      jest.advanceTimersByTime(3000)
    })
    expect(onReconnect).toHaveBeenCalledTimes(2)

    await act(async () => {
      jest.advanceTimersByTime(4000)
    })
    expect(onReconnect).toHaveBeenCalledTimes(2) // Should not try again
    expect(result.current.isReconnecting).toBe(false)
  })
})
