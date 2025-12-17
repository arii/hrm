/**
 * @jest-environment jsdom
 */
import { render, fireEvent, screen } from '@testing-library/react'
import VolumeControl from '@/components/shared/VolumeControl'
import '@testing-library/jest-dom'

describe('VolumeControl', () => {
  it('should render the volume slider and mute button', () => {
    render(
      <VolumeControl
        volume={50}
        muted={false}
        onVolumeChange={jest.fn()}
        onToggleMute={jest.fn()}
      />
    )

    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
  })

  it('should call onToggleMute when the mute button is clicked', () => {
    const onToggleMute = jest.fn()
    render(
      <VolumeControl
        volume={50}
        muted={false}
        onVolumeChange={jest.fn()}
        onToggleMute={onToggleMute}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /mute/i }))
    expect(onToggleMute).toHaveBeenCalled()
  })
})
