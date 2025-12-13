'use client'

import { useContext } from 'react'
import { ToastContext } from '@/context/ToastContext'
import { AlertColor } from '@mui/material/Alert'

/**
 * Custom hook for accessing the toast notification system.
 *
 * Provides a function `addToast` to display messages to the user.
 *
 * @example
 * const { addToast } = useToast()
 * addToast('This is a success message!', 'success')
 *
 * @returns An object containing the `addToast` function.
 * @throws {Error} If used outside of a `ToastProvider`.
 */
export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  const { addToast } = context

  /**
   * Displays a toast notification.
   * @param message The message to display.
   * @param severity The severity of the message (e.g., 'success', 'error', 'warning', 'info').
   * @param duration The duration in milliseconds for the toast to be visible. Defaults to 6000.
   */
  const showToast = (
    message: string,
    severity: AlertColor,
    duration?: number
  ) => {
    addToast(message, severity, duration)
  }

  return { addToast: showToast }
}
