/**
 * @jest-environment jsdom
 */
// tests/unit/components/shared/VolumeSlider.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import VolumeSlider from '@/components/shared/VolumeSlider'

describe('VolumeSlider', () => {
  it('should have the correct accessibility attributes when not muted', () => {
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={() => {}}
      />
    )

    const muteButton = screen.getByRole('button', { name: /mute/i })
    expect(muteButton).toHaveAttribute('aria-label', 'Mute')

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-labelledby', 'volume-slider')

    const sliderLabel = screen.getByText('Volume')
    expect(sliderLabel).toHaveAttribute('id', 'volume-slider')
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

  it('displays the correct volume value when showValue is true', () => {
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
  })

  it('calls onVolumeChange when the slider is moved', () => {
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

  it('calls onToggleMute when the mute button is clicked', () => {
    const onToggleMute = jest.fn()
    render(
      <VolumeSlider
        volume={50}
        muted={false}
        onVolumeChange={() => {}}
        onToggleMute={onToggleMute}
      />
    )
    const muteButton = screen.getByLabelText(/mute/i)
    fireEvent.click(muteButton)
    expect(onToggleMute).toHaveBeenCalled()
  })
})
