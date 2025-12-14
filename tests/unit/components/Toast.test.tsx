import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { Toast } from '@/components/Toast'
import { Toast as ToastType } from '@/types/toast'

describe('Toast component', () => {
  const mockOnClose = jest.fn()

  const toastSuccess: ToastType = {
    id: 1,
    message: 'This is a success message.',
    type: 'success',
  }

  const toastError: ToastType = {
    id: 2,
    message: 'This is an error message.',
    type: 'error',
  }

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders success toast correctly', () => {
    render(<Toast toast={toastSuccess} onClose={mockOnClose} />)

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('This is a success message.')).toBeInTheDocument()
    expect(screen.getByTestId('success-icon')).toBeInTheDocument()
  })

  it('renders error toast correctly', () => {
    render(<Toast toast={toastError} onClose={mockOnClose} />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('This is an error message.')).toBeInTheDocument()
    expect(screen.getByTestId('error-icon')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    render(<Toast toast={toastSuccess} onClose={mockOnClose} />)

    fireEvent.click(screen.getByLabelText('close'))
    expect(mockOnClose).toHaveBeenCalledWith(toastSuccess.id)
  })
})
