/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react'
import { useAudio } from '@/hooks/useAudio'
import { useTimerData } from '@/context/WebSocketContext'
import { audioManager } from '@/utils/audioManager'

jest.mock('@/context/WebSocketContext', () => ({
  useTimerData: jest.fn(),
}))

jest.mock('@/utils/audioManager', () => ({
  audioManager: {
    loadAudio: jest.fn(),
    playShort: jest.fn(),
    playLong: jest.fn(),
  },
}))

const mockedUseTimerData = useTimerData as jest.Mock

describe('useAudio', () => {
  const setup = (overrides: Record<string, unknown> = {}) => {
    mockedUseTimerData.mockReturnValue({
      soundToPlay: null,
      soundEventId: 0,
      ...overrides,
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('plays the short sound for COUNTDOWN events', () => {
    setup({ soundToPlay: 'COUNTDOWN', soundEventId: 1 })
    renderHook(() => useAudio())
    expect(audioManager.playShort).toHaveBeenCalledTimes(1)
    expect(audioManager.playLong).not.toHaveBeenCalled()
  })

  it.each(['WORK', 'REST'])('plays the long sound for %s events', (sound) => {
    setup({ soundToPlay: sound, soundEventId: 2 })
    renderHook(() => useAudio())
    expect(audioManager.playLong).toHaveBeenCalledTimes(1)
    expect(audioManager.playShort).not.toHaveBeenCalled()
  })

  it('ignores repeat deliveries of the same event id', () => {
    setup({ soundToPlay: 'WORK', soundEventId: 3 })
    const { rerender } = renderHook(() => useAudio())
    rerender()
    rerender()
    expect(audioManager.playLong).toHaveBeenCalledTimes(1)
  })

  it('stays silent without a sound or event id', () => {
    setup({ soundToPlay: null, soundEventId: 4 })
    const { unmount } = renderHook(() => useAudio())
    unmount()
    setup({ soundToPlay: 'WORK', soundEventId: 0 })
    renderHook(() => useAudio())
    expect(audioManager.playShort).not.toHaveBeenCalled()
    expect(audioManager.playLong).not.toHaveBeenCalled()
  })

  it('warns on unknown sound types', () => {
    setup({ soundToPlay: 'BELL', soundEventId: 5 })
    renderHook(() => useAudio())
    expect(audioManager.playShort).not.toHaveBeenCalled()
    expect(audioManager.playLong).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Unknown sound type')
    )
  })

  it('loads audio on initializeAudio', () => {
    setup()
    const { result } = renderHook(() => useAudio())
    act(() => {
      result.current.initializeAudio()
    })
    expect(audioManager.loadAudio).toHaveBeenCalledTimes(1)
  })
})
