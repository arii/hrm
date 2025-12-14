/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import VolumeControl from '../../../../components/Spotify/VolumeControl'
import '@testing-library/jest-dom'

describe('VolumeControl Accessibility', () => {
  const mockOnVolumeChange = jest.fn()
  const mockOnVolumeChangeCommitted = jest.fn()
  const defaultProps = {
    volume: 50,
    onVolumeChange: mockOnVolumeChange,
    onVolumeChangeCommitted: mockOnVolumeChangeCommitted,
  }

  it('renders slider with correct aria-label and ARIA value attributes', () => {
    render(<VolumeControl {...defaultProps} />)
    const slider = screen.getByRole('slider')

    // Check aria-label
    expect(slider).toHaveAttribute('aria-label', 'Spotify volume')

    // Check ARIA value attributes (MUI Slider handles these, but we verify per feedback)
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '100')
    expect(slider).toHaveAttribute('aria-valuenow', '50')
  })

  it('hides the volume icon from screen readers', () => {
    render(<VolumeControl {...defaultProps} />)
    // Find the svg icon. Since it's hidden, getByRole('img', { hidden: true }) might work
    // or querySelector.
    const icons = document.querySelectorAll('svg')
    let foundHiddenIcon = false
    icons.forEach((icon) => {
      // MUI icons usually have aria-hidden="true" by default or passed via props
      if (icon.getAttribute('aria-hidden') === 'true') {
        foundHiddenIcon = true
      }
    })
    expect(foundHiddenIcon).toBe(true)
  })

  it('supports keyboard interaction', () => {
    render(<VolumeControl {...defaultProps} />)
    const slider = screen.getByRole('slider')

    slider.focus()
    expect(slider).toHaveFocus()

    // Arrow Right should increase volume
    fireEvent.keyDown(slider, { key: 'ArrowRight', code: 'ArrowRight' })
    expect(mockOnVolumeChange).toHaveBeenCalled()

    // Arrow Left should decrease volume
    fireEvent.keyDown(slider, { key: 'ArrowLeft', code: 'ArrowLeft' })
    expect(mockOnVolumeChange).toHaveBeenCalled()
  })
})
