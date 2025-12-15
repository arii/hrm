'use client'

import { Snackbar, Alert, useTheme } from '@mui/material'
import { useToast } from '@/context/ToastContext'

const Toast = () => {
  const { toasts, hideToast } = useToast()
  const theme = useTheme()

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => hideToast(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          sx={{
            top: theme.spacing(1 + index * 7),
            '& .MuiAlert-root': {
              boxShadow: theme.shadows[3],
            },
          }}
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
