/** @jest-environment jsdom */
// tests/unit/components/shared/VolumeSlider.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import VolumeSlider from '@/components/shared/VolumeSlider'
import '@testing-library/jest-dom'

describe('components/shared/VolumeSlider', () => {
  it('should render the slider and buttons', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    )
    expect(screen.getByTestId('volume-slider-container')).toBeInTheDocument()
    expect(screen.getByTestId('volume-slider-mute-button')).toBeInTheDocument()
    expect(screen.getByTestId('volume-slider-input')).toBeInTheDocument()
  })

  it('should call onVolumeChange when the slider is moved', () => {
    const onVolumeChange = jest.fn()
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={onVolumeChange}
        onToggleMute={() => {}}
      />
    )
    const slider = screen.getByRole('slider')
    fireEvent.mouseDown(slider, { clientX: 75, clientY: 0 })
    expect(onVolumeChange).toHaveBeenCalled()
  })

  it('should call onToggleMute when the mute button is clicked', () => {
    const onToggleMute = jest.fn()
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={onToggleMute}
      />
    )
    const muteButton = screen.getByTestId('volume-slider-mute-button')
    fireEvent.click(muteButton)
    expect(onToggleMute).toHaveBeenCalled()
  })

  it('should display the volume value when showValue is true', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
        showValue={true}
      />
    )
    expect(screen.getByTestId('volume-slider-value')).toHaveTextContent('50')
  })
})
