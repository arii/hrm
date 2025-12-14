import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ToastProvider, useToast } from '@/context/ToastContext'
import { ToastType } from '@/types/toast'

const TestComponent = () => {
  const { showToast } = useToast()

  const handleShowToast = (
    message: string,
    type: ToastType,
    duration?: number
  ) => {
    showToast(message, type, duration)
  }

  return (
    <div>
      <button onClick={() => handleShowToast('Success!', 'success')}>
        Show Success Toast
      </button>
      <button onClick={() => handleShowToast('Error!', 'error')}>
        Show Error Toast
      </button>
    </div>
  )
}

describe('useToast hook and ToastProvider', () => {
  it('shows a toast when showToast is called', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Success Toast'))

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Success!')).toBeInTheDocument()
    expect(screen.getByTestId('success-icon')).toBeInTheDocument()
  })

  it('allows closing a toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Error Toast'))

    expect(screen.getByText('Error')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('close'))

    expect(screen.queryByText('Error!')).not.toBeInTheDocument()
  })
})
