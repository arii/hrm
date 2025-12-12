/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import VolumeControl from '@/components/Spotify/VolumeControl'

describe('VolumeControl', () => {
  const mockOnVolumeChange = jest.fn()
  const mockOnVolumeChangeCommitted = jest.fn()

  const defaultProps = {
    volume: 50,
    onVolumeChange: mockOnVolumeChange,
    onVolumeChangeCommitted: mockOnVolumeChangeCommitted,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly with initial volume', () => {
    render(<VolumeControl {...defaultProps} />)

    // Check if the volume text is displayed
    expect(screen.getByText('50')).toBeInTheDocument()

    // Check if the slider renders
    // Note: MUI Slider is complex, often we find it by role 'slider'
    const slider = screen.getByRole('slider')
    expect(slider).toBeInTheDocument()
    expect(slider).toHaveValue('50')
  })

  it('has the correct accessible label', () => {
    render(<VolumeControl {...defaultProps} />)
    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('aria-label', 'Volume')
  })

  it('calls onVolumeChange when slider value changes', () => {
    render(<VolumeControl {...defaultProps} />)
    const slider = screen.getByRole('slider')

    // MUI Slider interaction simulation
    fireEvent.change(slider, { target: { value: 75 } })

    expect(mockOnVolumeChange).toHaveBeenCalledWith(75)
  })
})
