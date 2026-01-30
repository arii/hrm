/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import PlaybackControls from '@/components/shared/PlaybackControls'
import '@testing-library/jest-dom'

describe('components/shared/PlaybackControls', () => {
  const mockOnCommand = jest.fn()

  beforeEach(() => {
    mockOnCommand.mockClear()
  })

  it('renders correctly', () => {
    render(
      <PlaybackControls
        isPlaying={false}
        onCommand={mockOnCommand}
        disabled={false}
      />
    )

    expect(screen.getByTestId('spotify-prev')).toBeInTheDocument()
    expect(screen.getByTestId('spotify-play-pause')).toBeInTheDocument()
    expect(screen.getByTestId('spotify-next')).toBeInTheDocument()
  })

  it('shows play icon when paused', () => {
    render(
      <PlaybackControls
        isPlaying={false}
        onCommand={mockOnCommand}
        disabled={false}
      />
    )
    expect(screen.getByLabelText('Play')).toBeInTheDocument()
    expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument()
  })

  it('shows pause icon when playing', () => {
    render(
      <PlaybackControls
        isPlaying={true}
        onCommand={mockOnCommand}
        disabled={false}
      />
    )
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
    expect(screen.queryByLabelText('Play')).not.toBeInTheDocument()
  })

  it('calls onCommand with correct values', () => {
    render(
      <PlaybackControls
        isPlaying={false}
        onCommand={mockOnCommand}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByTestId('spotify-prev'))
    expect(mockOnCommand).toHaveBeenCalledWith('PREVIOUS')

    fireEvent.click(screen.getByTestId('spotify-play-pause'))
    expect(mockOnCommand).toHaveBeenCalledWith('PLAY')

    fireEvent.click(screen.getByTestId('spotify-next'))
    expect(mockOnCommand).toHaveBeenCalledWith('NEXT')
  })

  it('calls onCommand with PAUSE when playing', () => {
    render(
      <PlaybackControls
        isPlaying={true}
        onCommand={mockOnCommand}
        disabled={false}
      />
    )

    fireEvent.click(screen.getByTestId('spotify-play-pause'))
    expect(mockOnCommand).toHaveBeenCalledWith('PAUSE')
  })

  it('disables buttons when disabled prop is true', () => {
    render(
      <PlaybackControls
        isPlaying={false}
        onCommand={mockOnCommand}
        disabled={true}
      />
    )

    expect(screen.getByTestId('spotify-prev')).toBeDisabled()
    expect(screen.getByTestId('spotify-play-pause')).toBeDisabled()
    expect(screen.getByTestId('spotify-next')).toBeDisabled()
  })
})
