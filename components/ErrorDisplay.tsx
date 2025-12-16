'use client'

import React from 'react'
import { useError } from '@/context/ErrorContext'
import { Alert, Snackbar } from '@mui/material'

/**
 * A component that displays error messages as toast notifications.
 * It consumes the `ErrorContext` to get the list of errors and displays them.
 */
const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useError()

  return (
    <>
      {errors.map((error) => (
        <Snackbar
          key={error.id}
          open={true}
          autoHideDuration={error.type === 'transient' ? 5000 : null}
          onClose={() => removeError(error.id)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => removeError(error.id)}
            severity="error"
            variant="filled"
            sx={{ width: '100%' }}
          >
            {error.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}

export default ErrorDisplay
