/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { OnboardingOverlay } from '../../../components/OnboardingOverlay'
import { checkOnboardingRequirements } from '@/utils/browserSupport'

// Mock the dependencies
jest.mock('@/utils/browserSupport', () => ({
  checkOnboardingRequirements: jest.fn(),
}))

describe('OnboardingOverlay', () => {
  const mockCheckOnboardingRequirements =
    checkOnboardingRequirements as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when all requirements are supported', () => {
    mockCheckOnboardingRequirements.mockReturnValue({
      allSupported: true,
      bluetooth: true,
      isSecure: true,
      webSockets: true,
    })

    const { container } = render(<OnboardingOverlay />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders alert when Bluetooth is not supported', () => {
    mockCheckOnboardingRequirements.mockReturnValue({
      allSupported: false,
      bluetooth: false,
      isSecure: true,
      webSockets: true,
    })

    render(<OnboardingOverlay />)

    expect(screen.getByText('Browser Incompatible')).toBeInTheDocument()
    expect(
      screen.getByText(/please use a browser that supports Web Bluetooth/i)
    ).toBeInTheDocument()
  })

  it('renders alert when not secure (HTTPS)', () => {
    mockCheckOnboardingRequirements.mockReturnValue({
      allSupported: false,
      bluetooth: true,
      isSecure: false,
      webSockets: true,
    })

    render(<OnboardingOverlay />)

    expect(screen.getByText('Browser Incompatible')).toBeInTheDocument()
    expect(
      screen.getByText(
        'A secure connection (HTTPS) is required for Bluetooth features.'
      )
    ).toBeInTheDocument()
  })

  it('renders alert when WebSockets are not supported', () => {
    mockCheckOnboardingRequirements.mockReturnValue({
      allSupported: false,
      bluetooth: true,
      isSecure: true,
      webSockets: false,
    })

    render(<OnboardingOverlay />)

    expect(screen.getByText('Browser Incompatible')).toBeInTheDocument()
    expect(
      screen.getByText(/Your browser does not support WebSockets/i)
    ).toBeInTheDocument()
  })

  it('can be dismissed', () => {
    mockCheckOnboardingRequirements.mockReturnValue({
      allSupported: false,
      bluetooth: false,
      isSecure: true,
      webSockets: true,
    })

    render(<OnboardingOverlay />)

    expect(screen.getByText('Browser Incompatible')).toBeInTheDocument()

    // MUI Alert usually has a close button if onClose is provided
    const closeButton = screen.getByLabelText('Close')
    fireEvent.click(closeButton)

    expect(screen.queryByText('Browser Incompatible')).not.toBeInTheDocument()
  })
})
