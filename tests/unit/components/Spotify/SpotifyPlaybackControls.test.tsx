import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SpotifyPlaybackControls from '@/components/Spotify/SpotifyPlaybackControls'

describe('SpotifyPlaybackControls', () => {
  const defaultProps = {
    isPlaying: false,
    onPlayPause: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    disabled: false,
  }

  it('renders all control buttons', () => {
    render(<SpotifyPlaybackControls {...defaultProps} />)
    expect(screen.getByTestId('spotify-previous-button')).toBeInTheDocument()
    expect(screen.getByTestId('spotify-play-pause-button')).toBeInTheDocument()
    expect(screen.getByTestId('spotify-next-button')).toBeInTheDocument()
  })

  it('shows Play icon when paused', () => {
    render(<SpotifyPlaybackControls {...defaultProps} isPlaying={false} />)
    expect(screen.getByTestId('spotify-play-pause-button')).toHaveAttribute(
      'aria-label',
      'Play'
    )
    expect(screen.getByTestId('PlayArrowIcon')).toBeInTheDocument()
  })

  it('shows Pause icon when playing', () => {
    render(<SpotifyPlaybackControls {...defaultProps} isPlaying={true} />)
    expect(screen.getByTestId('spotify-play-pause-button')).toHaveAttribute(
      'aria-label',
      'Pause'
    )
    expect(screen.getByTestId('PauseIcon')).toBeInTheDocument()
  })

  it('calls handlers on click', () => {
    render(<SpotifyPlaybackControls {...defaultProps} />)

    fireEvent.click(screen.getByTestId('spotify-previous-button'))
    expect(defaultProps.onPrevious).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('spotify-play-pause-button'))
    expect(defaultProps.onPlayPause).toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('spotify-next-button'))
    expect(defaultProps.onNext).toHaveBeenCalled()
  })

  it('disables buttons when disabled prop is true', () => {
    render(<SpotifyPlaybackControls {...defaultProps} disabled={true} />)

    expect(screen.getByTestId('spotify-previous-button')).toBeDisabled()
    expect(screen.getByTestId('spotify-play-pause-button')).toBeDisabled()
    expect(screen.getByTestId('spotify-next-button')).toBeDisabled()
  })
})
