
/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react'
import { useAudio } from '@/hooks/useAudio'
import { useWebSocket } from '@/context/WebSocketContext'
import { audioManager } from '@/utils/audioManager'
import { act } from 'react'

jest.mock('@/context/WebSocketContext')
jest.mock('@/utils/audioManager')

const mockUseWebSocket = useWebSocket as jest.Mock

describe('useAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not adjust volume if spotifyVolume is not a number', () => {
    mockUseWebSocket.mockReturnValue({
      timerData: { spotifyVolume: undefined },
    })
    renderHook(() => useAudio())
    expect(audioManager.setVolume).not.toHaveBeenCalled()
  })

  it('should adjust volume based on spotifyVolume', () => {
    const setVolumeSpy = jest.spyOn(audioManager, 'setVolume')
    mockUseWebSocket.mockReturnValue({
      timerData: { spotifyVolume: 50 },
    })
    const { rerender } = renderHook(() => useAudio())

    act(() => {
        rerender()
    })

    expect(setVolumeSpy).toHaveBeenCalledWith(75)
  })

  it('should clamp volume to 100', () => {
    const setVolumeSpy = jest.spyOn(audioManager, 'setVolume')
    mockUseWebSocket.mockReturnValue({
      timerData: { spotifyVolume: 100 },
    })
    const { rerender } = renderHook(() => useAudio())

    act(() => {
        rerender()
    })

    expect(setVolumeSpy).toHaveBeenCalledWith(100)
  })

  it('should play short beep on COUNTDOWN sound event', () => {
    const playShortSpy = jest.spyOn(audioManager, 'playShort')
    mockUseWebSocket.mockReturnValue({
      timerData: { soundToPlay: 'COUNTDOWN', soundEventId: 1 },
    })
    const { rerender } = renderHook(() => useAudio())

    act(() => {
        rerender()
    })

    expect(playShortSpy).toHaveBeenCalled()
  })

  it('should play long beep on WORK sound event', () => {
    const playLongSpy = jest.spyOn(audioManager, 'playLong')
    mockUseWebSocket.mockReturnValue({
      timerData: { soundToPlay: 'WORK', soundEventId: 1 },
    })
    const { rerender } = renderHook(() => useAudio())

    act(() => {
        rerender()
    })

    expect(playLongSpy).toHaveBeenCalled()
  })

  it('should play long beep on REST sound event', () => {
    const playLongSpy = jest.spyOn(audioManager, 'playLong')
    mockUseWebSocket.mockReturnValue({
      timerData: { soundToPlay: 'REST', soundEventId: 1 },
    })
    const { rerender } = renderHook(() => useAudio())

    act(() => {
        rerender()
    })

    expect(playLongSpy).toHaveBeenCalled()
  })
})
