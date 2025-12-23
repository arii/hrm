/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import Main from '@/app/main'
import ErrorFallback from '@/components/ErrorFallback'

// Mock the Footer component to throw an error
jest.mock('@/components/Footer', () => {
  return function MockFooter() {
    throw new Error('Test error from Footer')
  }
})

// Mock the ErrorFallback component to easily identify it
jest.mock('@/components/ErrorFallback', () => {
  return function MockErrorFallback() {
    return <div>Error Fallback UI</div>
  }
})

describe('Main component with ErrorBoundary', () => {
  it('should render the ErrorFallback when a child component throws an error', () => {
    // Suppress the expected error from appearing in the console
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(<Main>Test Children</Main>)

    // Check if the ErrorFallback UI is displayed
    expect(screen.getByText('Error Fallback UI')).toBeInTheDocument()

    // Restore the original console.error function
    consoleErrorSpy.mockRestore()
  })
})
