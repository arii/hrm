/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ErrorBoundary from '@/components/ErrorBoundary'
import ErrorFallback from '@/components/ErrorFallback'

// Mock the console.error function to spy on its calls
const consoleErrorSpy = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {})

const ThrowError = () => {
  throw new Error('Test error')
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleErrorSpy.mockClear()
  })

  it('should render the fallback UI when a child component throws an error', () => {
    render(
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Reload Page' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go Home' })).toBeInTheDocument()
  })

  it('should log the error details to the console', () => {
    render(
      <ErrorBoundary fallback={<ErrorFallback />}>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2)
    const firstArgument = consoleErrorSpy.mock.calls[1][0]
    expect(firstArgument).toBe('ErrorBoundary caught an error:')
  })
})
