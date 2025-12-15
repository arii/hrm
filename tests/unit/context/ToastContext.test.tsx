/**
 * @jest-environment jsdom
 */
import React from 'react'
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react'
import '@testing-library/jest-dom'
import { ToastProvider, useToast } from '@/context/ToastContext'
import Toast from '@/components/shared/Toast'

jest.mock('uuid', () => {
  let count = 0
  return {
    v4: () => `test-uuid-${count++}`,
  }
})

const TestComponent = () => {
  const { showToast } = useToast()

  return (
    <div>
      <button onClick={() => showToast('Test Message 1', 'success')}>
        Show Toast 1
      </button>
      <button onClick={() => showToast('Test Message 2', 'info')}>
        Show Toast 2
      </button>
      <Toast />
    </div>
  )
}

describe('ToastContext', () => {
  it('should show and hide multiple toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    // Initially, no toasts should be visible
    expect(screen.queryByText('Test Message 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Test Message 2')).not.toBeInTheDocument()

    // Click the button to show the first toast
    fireEvent.click(screen.getByText('Show Toast 1'))

    // The first toast should now be visible
    expect(screen.getByText('Test Message 1')).toBeInTheDocument()

    // Click the button to show the second toast
    fireEvent.click(screen.getByText('Show Toast 2'))

    // Both toasts should be visible
    expect(screen.getByText('Test Message 1')).toBeInTheDocument()
    expect(screen.getByText('Test Message 2')).toBeInTheDocument()

    // Find the close buttons and click them to hide the toasts
    const closeButtons = screen.getAllByRole('button', { name: /close/i })
    fireEvent.click(closeButtons[0])
    fireEvent.click(closeButtons[1])

    // Wait for the toasts to be removed from the DOM
    await waitFor(() => {
      expect(screen.queryByText('Test Message 1')).not.toBeInTheDocument()
      expect(screen.queryByText('Test Message 2')).not.toBeInTheDocument()
    })
  })
})
