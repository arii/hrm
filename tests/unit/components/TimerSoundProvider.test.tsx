/**
 * @jest-environment jsdom
 */
import { render, fireEvent } from '@testing-library/react'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { audioManager } from '@/utils/audioManager'

jest.mock('@/utils/audioManager', () => ({
  audioManager: {
    loadAudio: jest.fn(),
    playShort: jest.fn(),
    playLong: jest.fn(),
    toggleMute: jest.fn(),
    getVolume: jest.fn(() => 70),
    setVolume: jest.fn(),
  },
}))

const mockedLoadAudio = audioManager.loadAudio as jest.Mock

describe('TimerSoundProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('unlocks audio on the first click', () => {
    render(<TimerSoundProvider>content</TimerSoundProvider>)
    fireEvent.click(document)
    expect(mockedLoadAudio).toHaveBeenCalledTimes(1)
  })

  it('unlocks audio on the first keydown and unlocks only once', () => {
    render(<TimerSoundProvider>content</TimerSoundProvider>)
    fireEvent.keyDown(document, { key: 'Enter' })
    fireEvent.click(document)
    expect(mockedLoadAudio).toHaveBeenCalledTimes(1)
  })

  it('keeps the volume keyboard shortcuts working', () => {
    render(<TimerSoundProvider>content</TimerSoundProvider>)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    expect(audioManager.setVolume).toHaveBeenCalledWith(75)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    expect(audioManager.setVolume).toHaveBeenCalledWith(65)
    fireEvent.keyDown(window, { key: 'm' })
    expect(audioManager.toggleMute).toHaveBeenCalledTimes(1)
  })

  it('leaves arrow keys and m to a focused slider or text field', () => {
    render(
      <TimerSoundProvider>
        <div role="slider" tabIndex={0} aria-valuenow={35} data-testid="s" />
        <input data-testid="field" />
      </TimerSoundProvider>
    )
    const slider = document.querySelector('[data-testid="s"]')!
    fireEvent.keyDown(slider, { key: 'ArrowDown' })
    fireEvent.keyDown(document.querySelector('[data-testid="field"]')!, {
      key: 'm',
    })
    expect(audioManager.setVolume).not.toHaveBeenCalled()
    expect(audioManager.toggleMute).not.toHaveBeenCalled()
  })
})
