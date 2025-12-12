/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HrTile from '@/components/HrTile'

describe('HrTile', () => {
  const defaultProps = {
    name: 'Test User',
    bpm: 120,
    percentMax: 60,
    isAlerting: false,
    alertMessage: 'Signal Lost',
  }

  it('renders the alert banner when isAlerting is true', () => {
    // Arrange
    const props = { ...defaultProps, isAlerting: true }

    // Act
    render(<HrTile {...props} />)

    // Assert
    const alertBanner = screen.getByTestId('hr-tile-alert-banner')
    expect(alertBanner).toBeInTheDocument()
    expect(screen.getByText('Signal Lost')).toBeInTheDocument()
  })

  it('does not render the alert banner when isAlerting is false', () => {
    // Arrange
    const props = { ...defaultProps, isAlerting: false }

    // Act
    render(<HrTile {...props} />)

    // Assert
    const alertBanner = screen.queryByTestId('hr-tile-alert-banner')
    expect(alertBanner).not.toBeInTheDocument()
  })
})
