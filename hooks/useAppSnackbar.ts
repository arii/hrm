import { useSnackbar } from 'notistack'
import { useCallback } from 'react'

/**
 * @deprecated Use the `useAppSnackbar` hook instead of `notistack's` `useSnackbar`.
 *
 * This custom hook simplifies the API for showing snackbars and ensures that the
 * functions returned are stable, preventing unnecessary re-renders when used in
 * dependency arrays of other hooks.
 *
 * @returns An object with `showSuccess`, `showError`, `showInfo`, and `showWarning` methods.
 */
export function useAppSnackbar() {
  const { enqueueSnackbar } = useSnackbar()

  const showSuccess = useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: 'success' })
    },
    [enqueueSnackbar]
  )

  const showError = useCallback(
    (message: string, options?: { persist?: boolean }) => {
      enqueueSnackbar(message, {
        variant: 'error',
        persist: options?.persist,
      })
    },
    [enqueueSnackbar]
  )

  const showInfo = useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: 'info' })
    },
    [enqueueSnackbar]
  )

  const showWarning = useCallback(
    (message: string) => {
      enqueueSnackbar(message, { variant: 'warning' })
    },
    [enqueueSnackbar]
  )

  return { showSuccess, showError, showInfo, showWarning }
}
