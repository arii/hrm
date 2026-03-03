/** @jest-environment jsdom */
// tests/unit/components/shared/VolumeSlider.test.tsx
import { render, screen, fireEvent, act } from '@testing-library/react'
import VolumeSlider from '@/components/shared/VolumeSlider'
import '@testing-library/jest-dom'

describe('components/shared/VolumeSlider', () => {
  it('should render the slider and buttons with correct accessibility attributes', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    )

    // Check container and basic elements
    expect(screen.getByTestId('volume-slider-container')).toBeInTheDocument()

    // Check mute button
    const muteButton = screen.getByRole('button', { name: /mute/i })
    expect(muteButton).toBeInTheDocument()
    expect(muteButton).toHaveAttribute('aria-label', 'Mute')

    // Check slider
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveAttribute('aria-label', 'Volume control')
    expect(slider).toHaveAttribute('aria-valuetext', '50%')
  })

  it('should have the correct accessibility attributes when muted', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={true}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    )

    const unmuteButton = screen.getByRole('button', { name: /unmute/i })
    expect(unmuteButton).toHaveAttribute('aria-label', 'Unmute')
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
    fireEvent.change(slider, { target: { value: '100' } })
    expect(onVolumeChange).toHaveBeenCalledWith(100)
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
    const muteButton = screen.getByRole('button', { name: /mute/i })
    fireEvent.click(muteButton)
    expect(onToggleMute).toHaveBeenCalled()
  })

  it('should display the volume value when showValue is true', () => {
    render(
      <VolumeSlider
        volume={75}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
        showValue={true}
      />
    )
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByTestId('volume-slider-value')).toHaveTextContent('75')
  })

  it('should call onVolumeChangeCommitted on keyup (keyboard accessibility)', async () => {
    const onVolumeChangeCommitted = jest.fn()
    const onVolumeChange = jest.fn()
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={onVolumeChange}
        onVolumeChangeCommitted={onVolumeChangeCommitted}
        onToggleMute={() => {}}
      />
    )
    const slider = screen.getByRole('slider')
    await act(async () => {
      slider.focus()
    })
    // Simulate arrow right press
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' })

    // Simulate key up
    fireEvent.keyUp(slider, { key: 'ArrowRight', code: 'ArrowRight' })

    expect(onVolumeChangeCommitted).toHaveBeenCalled()
  })

  it('should update aria-valuetext when volume changes', () => {
    const { rerender } = render(
      <VolumeSlider
        volume={30}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '30%')

    rerender(
      <VolumeSlider
        volume={65}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    )
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '65%')
  })
})
