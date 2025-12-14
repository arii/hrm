/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '@/components/ErrorBoundary'
import '@testing-library/jest-dom'

// Mock console.error to prevent logging during tests
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {})

// A component that throws an error
const ProblemChild = () => {
  throw new Error('Test Error')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    mockConsoleError.mockClear()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Child Component</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Child Component')).toBeInTheDocument()
  })

  it('catches an error and displays the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText(
        "We've encountered an unexpected error. Your workout data is safe."
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Reload Application')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()

    // It should also log the error
    expect(mockConsoleError).toHaveBeenCalled()
  })

  it('allows the user to try again', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    )

    // Ensure fallback is visible
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Rerender with a healthy child. The error boundary is still in an error state
    // and will not automatically recover. It should still show the fallback UI.
    rerender(
      <ErrorBoundary>
        <div>Child Component</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Now, click the "Try Again" button. The boundary should reset its state
    // and attempt to render its new, healthy children.
    fireEvent.click(screen.getByText('Try Again'))

    // The child component should now be visible
    expect(screen.getByText('Child Component')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
