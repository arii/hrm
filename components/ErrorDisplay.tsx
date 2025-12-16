'use client'

import React from 'react'
import { useError } from '@/context/ErrorContext'
import { Alert, Snackbar, Stack } from '@mui/material'

/**
 * A component that displays error messages as toast notifications.
 * It consumes the `ErrorContext` to get the list of errors and displays them.
 */
const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useError()

  return (
    <Stack spacing={2} sx={{ position: 'fixed', bottom: 16, right: 16 }}>
      {errors.map((error) => (
        <Snackbar
          key={error.id}
          open={true}
          autoHideDuration={error.type === 'transient' ? 5000 : null}
          onClose={() => removeError(error.id)}
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
    </Stack>
  )
}

export default ErrorDisplay
