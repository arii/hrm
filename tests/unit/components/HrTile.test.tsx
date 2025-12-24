/**
 * @jest-environment jsdom
 */
const mockMotionDiv = jest.fn(
  ({ children, whileHover: _whileHover, ...props }) => (
    <div {...props}>{children}</div>
  )
)
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: mockMotionDiv,
  },
}))

import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import HrTile from '@/components/HrTile'
import { HrTileProps } from '@/types'

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Heart: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="heart-icon" {...props} />
  ),
  TrendingUp: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="trending-up-icon" {...props} />
  ),
}))

describe('HrTile Component', () => {
  beforeEach(() => {
    mockMotionDiv.mockClear()
  })
  const defaultProps: HrTileProps = {
    name: 'John Doe',
    bpm: 150,
    percentMax: 75,
    calories: 250,
    isConnected: true,
    isAlerting: false,
    alertMessage: '',
  }

  const renderComponent = (props: Partial<HrTileProps> = {}) => {
    return render(<HrTile {...defaultProps} {...props} />)
  }

  it('renders all the core data points', () => {
    renderComponent()
    expect(screen.getByText(defaultProps.percentMax)).toBeInTheDocument()
    expect(screen.getByText(defaultProps.bpm)).toBeInTheDocument()
    expect(
      screen.getByText(Math.floor(defaultProps.calories!))
    ).toBeInTheDocument()
    expect(screen.getByText(defaultProps.name!)).toBeInTheDocument()
  })

  it('renders the animated heart and trending up icons', () => {
    renderComponent()
    expect(screen.getByTestId('heart-icon')).toBeInTheDocument()
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument()
  })

  it('conditionally renders the name badge', () => {
    const { rerender } = renderComponent({ name: 'Valid Name' })
    expect(screen.getByText('Valid Name')).toBeInTheDocument()

    rerender(<HrTile {...defaultProps} name="user" />)
    expect(screen.queryByText('user')).not.toBeInTheDocument()

    rerender(<HrTile {...defaultProps} name="new user" />)
    expect(screen.queryByText('new user')).not.toBeInTheDocument()
  })

  it('displays a disconnected icon when not connected', () => {
    renderComponent({ isConnected: false })
    expect(screen.getByTestId('WifiOffIcon')).toBeInTheDocument()
  })

  it('shows an alerting overlay when alerting', () => {
    const alertMessage = 'Signal low...'
    renderComponent({ isAlerting: true, alertMessage })
    expect(screen.getByTestId('hr-tile-alert-overlay')).toBeInTheDocument()
    expect(screen.getByText(alertMessage)).toBeInTheDocument()
  })

  it('disables animations when areAnimationsEnabled is false', () => {
    renderComponent({ areAnimationsEnabled: false })
    const motionDivProps = mockMotionDiv.mock.calls[0][0]
    expect(motionDivProps.whileHover).toEqual({})
  })
})
