/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Mock child component that throws an error
const ProblemChild = () => {
  throw new Error('Test Error')
}

// Mock child component that renders successfully
const GoodChild = () => <div>Everything is fine</div>

describe('ErrorBoundary', () => {
  // Silence console.error for this test suite
  let consoleErrorSpy: jest.SpyInstance

  beforeAll(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(() => {
    consoleErrorSpy.mockRestore()
  })

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>
    )

    expect(screen.getByText('Everything is fine')).toBeInTheDocument()
  })

  it('catches an error from a child component and displays the fallback UI', () => {
    render(
      <ErrorBoundary>
        <ProblemChild />
      </ErrorBoundary>
    )

    // Check for fallback UI text
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(
      screen.getByText(
        "We've encountered an unexpected error. Your workout data is safe."
      )
    ).toBeInTheDocument()

    // Check for recovery buttons
    expect(
      screen.getByRole('button', { name: /Reload Application/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Try Again/i })
    ).toBeInTheDocument()
  })
})
