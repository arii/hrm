// tests/unit/context/ToastContext.test.tsx
/** @jest-environment jsdom */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToastProvider, useToast } from '@/context/ToastContext'
import '@testing-library/jest-dom'

const TestComponent = () => {
  const { addToast } = useToast()
  return (
    <button onClick={() => addToast('Test Message', 'success')}>
      Add Toast
    </button>
  )
}

describe('ToastContext', () => {
  it('should add a toast and then remove it', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    // Check that there are no toasts initially
    expect(screen.queryByText('Test Message')).not.toBeInTheDocument()

    // Add a toast
    fireEvent.click(screen.getByText('Add Toast'))

    // Check that the toast is displayed
    const toast = await screen.findByText('Test Message')
    expect(toast).toBeInTheDocument()

    // Wait for the toast to be removed automatically
    await waitFor(
      () => {
        expect(screen.queryByText('Test Message')).not.toBeInTheDocument()
      },
      { timeout: 7000 } // a bit longer than the default toast duration
    )
  })

  it('should throw an error if useToast is used outside of a ToastProvider', () => {
    // Suppress console.error for this test
    const consoleError = console.error
    console.error = jest.fn()

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useToast must be used within a ToastProvider')

    // Restore console.error
    console.error = consoleError
  })
})
