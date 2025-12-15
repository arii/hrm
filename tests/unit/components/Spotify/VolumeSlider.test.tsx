/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import VolumeSlider from '@/components/Spotify/VolumeSlider'
import '@testing-library/jest-dom'

describe('components/Spotify/VolumeSlider', () => {
  it('renders the volume slider', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={jest.fn()}
        onToggleMute={jest.fn()}
      />
    )
    expect(screen.getByRole('slider')).toBeInTheDocument()
  })

  it('displays the correct volume value', () => {
    render(
      <VolumeSlider
        volume={75}
        muted={false}
        onVolumeChange={jest.fn()}
        onToggleMute={jest.fn()}
      />
    )
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('calls onVolumeChange when the slider is moved', () => {
    const onVolumeChange = jest.fn()
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={onVolumeChange}
        onToggleMute={jest.fn()}
      />
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '100' } })
    expect(onVolumeChange).toHaveBeenCalledWith(100)
  })

  it('calls onToggleMute when the mute button is clicked', () => {
    const onToggleMute = jest.fn()
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={jest.fn()}
        onToggleMute={onToggleMute}
      />
    )
    const muteButton = screen.getByLabelText('Mute volume')
    fireEvent.click(muteButton)
    expect(onToggleMute).toHaveBeenCalled()
  })

  it('displays the unmute icon when muted', () => {
    render(
      <VolumeSlider
        volume={0}
        muted={true}
        onVolumeChange={jest.fn()}
        onToggleMute={jest.fn()}
      />
    )
    expect(screen.getByLabelText('Unmute volume')).toBeInTheDocument()
  })
})
