/**
 * @fileoverview Consolidated notification system using notistack.
 * 
 * This module provides a centralized API for displaying notifications
 * across the application. It abstracts the underlying notistack library
 * to provide a clean, consistent interface.
 * 
 * Usage:
 *   import { showError, showSuccess } from '@/lib/notifications'
 *   
 *   showError('Something went wrong')
 *   showSuccess('Operation completed')
 */

import { enqueueSnackbar, SnackbarKey } from 'notistack'

/**
 * Displays a success notification.
 * @param message The message to display
 * @returns The key of the enqueued snackbar
 */
export const showSuccess = (message: string): SnackbarKey => {
  return enqueueSnackbar(message, { variant: 'success' })
}

/**
 * Displays an error notification.
 * @param message The error message to display
 * @param options Configuration options for the notification
 * @param options.persist If true, the notification will persist until manually dismissed
 * @returns The key of the enqueued snackbar
 */
export const showError = (
  message: string,
  options?: { persist?: boolean }
): SnackbarKey => {
  return enqueueSnackbar(message, {
    variant: 'error',
    persist: options?.persist ?? false,
  })
}

/**
 * Displays an info notification.
 * @param message The message to display
 * @returns The key of the enqueued snackbar
 */
export const showInfo = (message: string): SnackbarKey => {
  return enqueueSnackbar(message, { variant: 'info' })
}

/**
 * Displays a warning notification.
 * @param message The message to display
 * @returns The key of the enqueued snackbar
 */
export const showWarning = (message: string): SnackbarKey => {
  return enqueueSnackbar(message, { variant: 'warning' })
}
