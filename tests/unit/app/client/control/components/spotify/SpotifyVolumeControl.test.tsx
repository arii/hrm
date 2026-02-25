/**
 * @jest-environment jsdom
 */
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import SpotifyVolumeControl from '@/app/client/control/components/spotify/SpotifyVolumeControl'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useAppSnackbar } from '@/hooks/useAppSnackbar'
import { useSpotifyCommand } from '@/hooks/useSpotifyCommand'
import '@testing-library/jest-dom'

jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: jest.fn(
    ({ volume, onVolumeChange, onVolumeChangeCommitted, onToggleMute }) => (
      <div data-testid="mock-volume-slider">
        <input
          type="range"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          onMouseUp={(e) =>
            onVolumeChangeCommitted?.(
              Number((e.target as HTMLInputElement).value)
            )
          }
          aria-label="Volume control"
        />
        <button onClick={onToggleMute} aria-label="Mute" />
      </div>
    )
  ),
}))

jest.mock('@/hooks/useVolumePreference', () => ({
  __esModule: true,
  default: jest.fn(),
  clampVolume: jest.requireActual('@/hooks/useVolumePreference').clampVolume,
}))

jest.mock('@/hooks/useAppSnackbar', () => ({
  useAppSnackbar: jest.fn(),
}))

jest.mock('@/hooks/useSpotifyCommand', () => ({
  useSpotifyCommand: jest.fn(),
}))

describe('components/spotify/SpotifyVolumeControl', () => {
  const mockSetVolume = jest.fn()
  const mockToggleMute = jest.fn()
  const mockShowWarning = jest.fn()
  const mockExecuteSpotify = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useVolumePreference as jest.Mock).mockReturnValue({
      volume: 50,
      muted: false,
      setVolume: mockSetVolume,
      toggleMute: mockToggleMute,
    })
    ;(useAppSnackbar as jest.Mock).mockReturnValue({
      showWarning: mockShowWarning,
    })
    ;(useSpotifyCommand as jest.Mock).mockReturnValue({
      execute: mockExecuteSpotify,
    })
  })

  it('syncs volume when playbackVolume changes', () => {
    const { rerender } = render(
      <SpotifyVolumeControl isConnected={true} playbackVolume={50} />
    )

    rerender(<SpotifyVolumeControl isConnected={true} playbackVolume={80} />)
    expect(mockSetVolume).toHaveBeenCalledWith(80)
  })

  it('prevents volume sync during sliding', () => {
    const { rerender } = render(
      <SpotifyVolumeControl isConnected={true} playbackVolume={50} />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '60' } })

    rerender(<SpotifyVolumeControl isConnected={true} playbackVolume={80} />)
    expect(mockSetVolume).not.toHaveBeenCalledWith(80)
  })

  it('sends volume command on commit', async () => {
    render(
      <SpotifyVolumeControl
        isConnected={true}
        playbackVolume={50}
        targetDeviceId="dev-1"
      />
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '70' } })
    fireEvent.mouseUp(slider, { target: { value: '70' } })

    await waitFor(() => {
      expect(mockExecuteSpotify).toHaveBeenCalledWith('SET_VOLUME', {
        volume: 70,
        deviceId: 'dev-1',
      })
    })
  })

  it('throttles offline warnings', () => {
    jest.useFakeTimers()
    render(<SpotifyVolumeControl isConnected={false} />)

    const slider = screen.getByRole('slider')

    // First change: warning shown
    fireEvent.change(slider, { target: { value: '60' } })
    expect(mockShowWarning).toHaveBeenCalledTimes(1)

    // Rapid change: no new warning
    fireEvent.change(slider, { target: { value: '70' } })
    expect(mockShowWarning).toHaveBeenCalledTimes(1)

    // Advance time
    act(() => {
      jest.advanceTimersByTime(3100)
    })

    fireEvent.change(slider, { target: { value: '80' } })
    expect(mockShowWarning).toHaveBeenCalledTimes(2)

    jest.useRealTimers()
  })
})
