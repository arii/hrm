/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useOptimisticPlayPause } from '@/app/client/control/components/useOptimisticPlayPause'
import { setOptimisticPlaying } from '@/lib/spotify/optimisticPlayback'

describe('useOptimisticPlayPause', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    setOptimisticPlaying(null)
  })

  afterEach(() => {
    setOptimisticPlaying(null)
    jest.useRealTimers()
  })

  it('flips displayPlaying on PLAY and reverts to server after grace', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticPlayPause({ sendCommand, serverIsPlaying: false })
    )
    expect(result.current.displayPlaying).toBe(false)

    act(() => {
      result.current.handlePlaybackCommand('PLAY')
    })
    expect(result.current.displayPlaying).toBe(true)
    expect(sendCommand).toHaveBeenCalledWith('PLAY')

    act(() => {
      jest.advanceTimersByTime(2500)
    })
    expect(result.current.displayPlaying).toBe(false)
  })

  it('flips displayPlaying on PAUSE', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticPlayPause({ sendCommand, serverIsPlaying: true })
    )
    act(() => {
      result.current.handlePlaybackCommand('PAUSE')
    })
    expect(result.current.displayPlaying).toBe(false)
    expect(sendCommand).toHaveBeenCalledWith('PAUSE')
  })

  it('drops same-command repeats within the cooldown window', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticPlayPause({ sendCommand, serverIsPlaying: true })
    )
    act(() => {
      result.current.handlePlaybackCommand('NEXT')
      result.current.handlePlaybackCommand('NEXT')
    })
    expect(sendCommand).toHaveBeenCalledTimes(1)

    // After the window, the same command goes through again.
    act(() => {
      jest.advanceTimersByTime(800)
      result.current.handlePlaybackCommand('NEXT')
    })
    expect(sendCommand).toHaveBeenCalledTimes(2)
  })

  it('lets a change of mind through during cooldown', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticPlayPause({ sendCommand, serverIsPlaying: false })
    )
    act(() => {
      result.current.handlePlaybackCommand('PLAY')
      result.current.handlePlaybackCommand('PAUSE')
    })
    expect(sendCommand).toHaveBeenCalledTimes(2)
    expect(result.current.displayPlaying).toBe(false)
  })

  it('forwards NEXT/PREVIOUS without optimism', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticPlayPause({ sendCommand, serverIsPlaying: false })
    )
    act(() => {
      result.current.handlePlaybackCommand('NEXT')
    })
    expect(result.current.displayPlaying).toBe(false)
    expect(sendCommand).toHaveBeenCalledWith('NEXT')
  })

  it('ignores non-playback commands', () => {
    const sendCommand = jest.fn()
    const { result } = renderHook(() =>
      useOptimisticPlayPause({ sendCommand, serverIsPlaying: false })
    )
    act(() => {
      result.current.handlePlaybackCommand('TRANSFER_PLAYBACK')
    })
    expect(sendCommand).not.toHaveBeenCalled()
  })
})
