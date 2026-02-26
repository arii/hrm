import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import SpotifyVolumeControl from '@/components/Spotify/SpotifyVolumeControl'

// Mock VolumeSlider since it's a separate complex component
jest.mock('@/components/shared/VolumeSlider', () => ({
  __esModule: true,
  default: ({
    volume,
    muted,
    onVolumeChange,
    onVolumeChangeCommitted,
    onToggleMute,
    disabled,
  }: any) => (
    <div data-testid="mock-volume-slider">
      <span data-testid="volume-value">{volume}</span>
      <span data-testid="muted-value">{muted.toString()}</span>
      <button
        data-testid="change-btn"
        onClick={() => onVolumeChange(50)}
      ></button>
      <button
        data-testid="commit-btn"
        onClick={() => onVolumeChangeCommitted(50)}
      ></button>
      <button data-testid="mute-btn" onClick={onToggleMute}></button>
      <span data-testid="disabled-value">{disabled?.toString()}</span>
    </div>
  ),
}))

describe('SpotifyVolumeControl', () => {
  const defaultProps = {
    volume: 30,
    isMuted: false,
    onVolumeChange: jest.fn(),
    onVolumeChangeCommitted: jest.fn(),
    onToggleMute: jest.fn(),
    disabled: false,
  }

  it('renders VolumeSlider with correct props', () => {
    render(<SpotifyVolumeControl {...defaultProps} />)
    expect(screen.getByTestId('mock-volume-slider')).toBeInTheDocument()
    expect(screen.getByTestId('volume-value')).toHaveTextContent('30')
    expect(screen.getByTestId('muted-value')).toHaveTextContent('false')
  })

  it('passes event handlers correctly', () => {
    render(<SpotifyVolumeControl {...defaultProps} />)

    fireEvent.click(screen.getByTestId('change-btn'))
    expect(defaultProps.onVolumeChange).toHaveBeenCalledWith(50)

    fireEvent.click(screen.getByTestId('commit-btn'))
    expect(defaultProps.onVolumeChangeCommitted).toHaveBeenCalledWith(50)

    fireEvent.click(screen.getByTestId('mute-btn'))
    expect(defaultProps.onToggleMute).toHaveBeenCalled()
  })

  it('passes disabled state correctly', () => {
    render(<SpotifyVolumeControl {...defaultProps} disabled={true} />)
    expect(screen.getByTestId('disabled-value')).toHaveTextContent('true')
  })
})
