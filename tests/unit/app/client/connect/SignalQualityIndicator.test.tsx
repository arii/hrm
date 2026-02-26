/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { SignalQualityIndicator } from '@/app/client/connect/SignalQualityIndicator'
import '@testing-library/jest-dom'

// Mock MUI icons
jest.mock('@mui/icons-material/SignalCellularAlt', () => ({
  __esModule: true,
  default: () => <div data-testid="SignalCellularAltIcon" />,
}))
jest.mock('@mui/icons-material/SignalCellularAlt2Bar', () => ({
  __esModule: true,
  default: () => <div data-testid="SignalCellularAlt2BarIcon" />,
}))
jest.mock('@mui/icons-material/SignalCellularAlt1Bar', () => ({
  __esModule: true,
  default: () => <div data-testid="SignalCellularAlt1BarIcon" />,
}))
jest.mock('@mui/icons-material/SignalCellularConnectedNoInternet0Bar', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="SignalCellularConnectedNoInternet0BarIcon" />
  ),
}))

describe('SignalQualityIndicator', () => {
  it('should render the "excellent" state with correct tooltip', () => {
    render(<SignalQualityIndicator periodMs={1000} isConnected={true} />)
    expect(screen.getByTestId('SignalCellularAltIcon')).toBeInTheDocument()
    expect(screen.getByText('1000ms')).toBeInTheDocument()
  })

  it('should render the "good" state', () => {
    render(<SignalQualityIndicator periodMs={1800} isConnected={true} />)
    expect(screen.getByTestId('SignalCellularAlt2BarIcon')).toBeInTheDocument()
    expect(screen.getByText('1800ms')).toBeInTheDocument()
  })

  it('should render the "poor" state', () => {
    render(<SignalQualityIndicator periodMs={2500} isConnected={true} />)
    expect(screen.getByTestId('SignalCellularAlt1BarIcon')).toBeInTheDocument()
    expect(screen.getByText('2500ms')).toBeInTheDocument()
  })

  it('should render the "none" state when disconnected', () => {
    render(<SignalQualityIndicator periodMs={1000} isConnected={false} />)
    expect(
      screen.getByTestId('SignalCellularConnectedNoInternet0BarIcon')
    ).toBeInTheDocument()
    expect(screen.queryByText('1000ms')).not.toBeInTheDocument()
  })

  it('should render the "Warning" state for weak signal', () => {
    render(
      <SignalQualityIndicator
        periodMs={1000}
        lastPeriodMs={2000}
        isConnected={true}
      />
    )
    expect(screen.getByText('Weak Signal')).toBeInTheDocument()
  })

  it('should render the "Critical" state for lost signal', () => {
    render(
      <SignalQualityIndicator
        periodMs={1000}
        lastPeriodMs={3500}
        isConnected={true}
      />
    )
    expect(screen.getByText('Signal Lost')).toBeInTheDocument()
  })
})
