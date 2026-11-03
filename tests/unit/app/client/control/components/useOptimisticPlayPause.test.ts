/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useOptimisticPlayPause } from '@/app/client/control/components/useOptimisticPlayPause'

describe('useOptimisticPlayPause', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('flips optimistic state on PLAY and reverts after grace', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() => useOptimisticPlayPause({ sendCommand }))
    expect(result.current.optimisticIsPlaying).toBeNull()

    act(() => {
      result.current.handlePlaybackCommand('PLAY')
    })
    expect(result.current.optimisticIsPlaying).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith('PLAY')

    act(() => {
      jest.advanceTimersByTime(2500)
    })
    expect(result.current.optimisticIsPlaying).toBeNull()
  })

  it('flips optimistic state on PAUSE', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() => useOptimisticPlayPause({ sendCommand }))
    act(() => {
      result.current.handlePlaybackCommand('PAUSE')
    })
    expect(result.current.optimisticIsPlaying).toBe(false)
    expect(sendCommand).toHaveBeenCalledWith('PAUSE')
  })

  it('forwards NEXT/PREVIOUS without optimism', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() => useOptimisticPlayPause({ sendCommand }))
    act(() => {
      result.current.handlePlaybackCommand('NEXT')
    })
    expect(result.current.optimisticIsPlaying).toBeNull()
    expect(sendCommand).toHaveBeenCalledWith('NEXT')
  })

  it('ignores non-playback commands', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() => useOptimisticPlayPause({ sendCommand }))
    act(() => {
      result.current.handlePlaybackCommand('TRANSFER_PLAYBACK')
    })
    expect(sendCommand).not.toHaveBeenCalled()
  })
})
