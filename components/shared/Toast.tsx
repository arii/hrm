'use client'

import React from 'react'
import { Snackbar, Alert } from '@mui/material'
import { useToast } from '@/context/ToastContext'

const Toast = () => {
  const { toasts, hideToast } = useToast()

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => hideToast(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{ top: `${8 + index * 60}px` }}
        >
          <Alert
            onClose={() => hideToast(toast.id)}
            severity={toast.severity}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  )
}

export default Toast
