/**
 * @jest-environment jsdom
 */

// We need a reference to the mock function to inspect it in tests.
// Declare it here before jest.mock is hoisted.
const mockMotionDiv = jest.fn()

// Now, mock the module.
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  motion: {
    div: mockMotionDiv, // Use the mock function here
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
    // Provide the mock implementation before each test
    mockMotionDiv.mockImplementation(
      ({ children, whileHover, initial, animate, transition, style }) => (
        <div
          data-testid="motion-div"
          data-whilehover={JSON.stringify(whileHover)}
          data-initial={JSON.stringify(initial)}
          data-animate={JSON.stringify(animate)}
          data-transition={JSON.stringify(transition)}
          style={style}
        >
          {children}
        </div>
      )
    )
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
    areAnimationsEnabled: true,
  }

  const renderComponent = (props: Partial<HrTileProps> = {}) => {
    return render(<HrTile {...defaultProps} {...props} />)
  }

  it('renders all the core data points', () => {
    renderComponent()
    // Check for percentMax with the percentage sign
    const percentElement = screen.getByTestId('live-hr-percent')
    expect(percentElement).toHaveTextContent(`${defaultProps.percentMax}%`)
    // Check for bpm
    expect(screen.getByText(defaultProps.bpm)).toBeInTheDocument()
    // Check for name
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
    // The mock passes props as data attributes, so we inspect those.
    // The mock component will receive the whileHover prop from HrTile.
    const receivedProps = mockMotionDiv.mock.calls[0][0]
    expect(receivedProps.whileHover).toEqual({})
  })

  it('enables animations when areAnimationsEnabled is true', () => {
    renderComponent({ areAnimationsEnabled: true })
    const receivedProps = mockMotionDiv.mock.calls[0][0]
    expect(receivedProps.whileHover).toEqual({ scale: 1.02, y: -5 })
  })
})
