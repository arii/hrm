'use client'

import React from 'react'
import { useToast } from '@/context/ToastContext'
import { Alert, Snackbar, Stack } from '@mui/material'

const ToastDisplay: React.FC = () => {
  const { toasts, removeToast } = useToast()

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
      {toasts.map((toast) => (
        <Snackbar
          open={true}
          key={toast.id}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          autoHideDuration={5000}
          onClose={() => removeToast(toast.id)}
        >
          <Alert
            onClose={() => removeToast(toast.id)}
            severity={toast.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </Stack>
  )
}

export default ToastDisplay
