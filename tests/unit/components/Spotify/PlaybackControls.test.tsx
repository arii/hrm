/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import PlaybackControls from '@/components/Spotify/PlaybackControls'

describe('PlaybackControls', () => {
  const onPlayPause = jest.fn()
  const onNext = jest.fn()
  const onPrevious = jest.fn()
  const onToggleShuffle = jest.fn()
  const onToggleRepeat = jest.fn()
  const onVolumeChange = jest.fn()
  const onVolumeChangeCommitted = jest.fn()

  it('renders the play button when not playing', () => {
    render(
      <PlaybackControls
        isPlaying={false}
        shuffleState={false}
        repeatState="off"
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrevious={onPrevious}
        onToggleShuffle={onToggleShuffle}
        onToggleRepeat={onToggleRepeat}
        volume={50}
        onVolumeChange={onVolumeChange}
        onVolumeChangeCommitted={onVolumeChangeCommitted}
      />
    )
    expect(screen.getByLabelText('play')).toBeInTheDocument()
  })

  it('renders the pause button when playing', () => {
    render(
      <PlaybackControls
        isPlaying={true}
        shuffleState={false}
        repeatState="off"
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrevious={onPrevious}
        onToggleShuffle={onToggleShuffle}
        onToggleRepeat={onToggleRepeat}
        volume={50}
        onVolumeChange={onVolumeChange}
        onVolumeChangeCommitted={onVolumeChangeCommitted}
      />
    )
    expect(screen.getByLabelText('pause')).toBeInTheDocument()
  })

  it('calls the correct callbacks when buttons are clicked', () => {
    render(
      <PlaybackControls
        isPlaying={true}
        shuffleState={false}
        repeatState="off"
        onPlayPause={onPlayPause}
        onNext={onNext}
        onPrevious={onPrevious}
        onToggleShuffle={onToggleShuffle}
        onToggleRepeat={onToggleRepeat}
        volume={50}
        onVolumeChange={onVolumeChange}
        onVolumeChangeCommitted={onVolumeChangeCommitted}
      />
    )
    fireEvent.click(screen.getByLabelText('pause'))
    expect(onPlayPause).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('next'))
    expect(onNext).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('previous'))
    expect(onPrevious).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('shuffle'))
    expect(onToggleShuffle).toHaveBeenCalled()
    fireEvent.click(screen.getByLabelText('repeat'))
    expect(onToggleRepeat).toHaveBeenCalled()
  })
})
