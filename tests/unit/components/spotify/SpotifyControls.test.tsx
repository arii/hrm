/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import SpotifyControls from '@/components/spotify/SpotifyControls'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

describe('SpotifyControls', () => {
  it('renders the play/pause, next, and previous buttons', () => {
    render(
      <SpotifyControls
        isPlaying={false}
        onPlayPause={jest.fn()}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
      />
    )
    expect(screen.getByLabelText('Play')).toBeInTheDocument()
    expect(screen.getByLabelText('Next track')).toBeInTheDocument()
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument()
  })

  it('renders the pause button when playing', () => {
    render(
      <SpotifyControls
        isPlaying={true}
        onPlayPause={jest.fn()}
        onNext={jest.fn()}
        onPrevious={jest.fn()}
      />
    )
    expect(screen.getByLabelText('Pause')).toBeInTheDocument()
  })

  it('calls the correct callbacks when buttons are clicked', () => {
    const onPlayPause = jest.fn()
    const onNext = jest.fn()
    const onPrevious = jest.fn()
    render(
      <SpotifyControls
        isPlaying={false}
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrevious={onPrevious}
      />
    )
    fireEvent.click(screen.getByLabelText('Play'))
    expect(onPlayPause).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Next track'))
    expect(onNext).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('Previous track'))
    expect(onPrevious).toHaveBeenCalled()
  })
})
