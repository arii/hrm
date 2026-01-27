/** @jest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import GoogleDocViewer from '../../../components/GoogleDocViewer'

// Mock the Skeleton component to simplify testing and focus on the loader logic
jest.mock('@mui/material/Skeleton', () => () => (
  <div data-testid="skeleton" />
))

describe('GoogleDocViewer', () => {
  const defaultProps = {
    title: 'Test Doc',
    embedUrl: 'https://example.com/embed',
  }

  it('renders the iframe with the correct URL', () => {
    render(<GoogleDocViewer {...defaultProps} />)
    const iframe = screen.getByTestId('google-doc-viewer-iframe')
    expect(iframe).toHaveAttribute(
      'src',
      'https://example.com/embed?embedded=true'
    )
  })

  describe('IframeWithLoader', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('shows the skeleton loader initially', () => {
      render(<GoogleDocViewer {...defaultProps} />)
      expect(screen.getByTestId('skeleton')).toBeInTheDocument()
      const iframe = screen.getByTestId('google-doc-viewer-iframe')
      expect(iframe).not.toBeVisible()
    })

    it('hides the skeleton and shows the iframe on load', () => {
      render(<GoogleDocViewer {...defaultProps} />)
      const iframe = screen.getByTestId('google-doc-viewer-iframe')

      // Simulate the onLoad event
      fireEvent.load(iframe)

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
      expect(iframe).toBeVisible()
    })

    it('hides the skeleton and shows the iframe after a timeout', () => {
      render(<GoogleDocViewer {...defaultProps} />)
      const iframe = screen.getByTestId('google-doc-viewer-iframe')

      expect(screen.getByTestId('skeleton')).toBeInTheDocument()
      expect(iframe).not.toBeVisible()

      // Fast-forward time by 3 seconds
      act(() => {
        jest.advanceTimersByTime(3000)
      })

      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
      expect(iframe).toBeVisible()
    })
  })

  it('receives a new key when refreshKey changes', () => {
    const { rerender } = render(
      <GoogleDocViewer {...defaultProps} refreshKey={0} />
    )

    const iframe = screen.getByTitle('Test Doc')
    const initialIframeInstance = iframe

    rerender(<GoogleDocViewer {...defaultProps} refreshKey={1} />)

    const newIframeInstance = screen.getByTitle('Test Doc')

    expect(newIframeInstance).not.toBe(initialIframeInstance)
  })
})
