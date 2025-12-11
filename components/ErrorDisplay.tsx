'use client'

import React from 'react'
import { useError } from '@/context/ErrorContext'
import { Alert, Snackbar, Stack } from '@mui/material'

const ErrorDisplay: React.FC = () => {
  const { errors, removeError } = useError()

  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        bottom: '80px', // Above the bottom nav bar
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1400, // Higher than other elements
        minWidth: '300px',
      }}
    >
      {errors.map((error) => (
        <Snackbar
          open={true}
          key={error.id}
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
    </Stack>
  )
}

export default ErrorDisplay
