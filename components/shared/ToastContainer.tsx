'use client'

import React, { useContext } from 'react'
import { ToastContext } from '@/context/ToastContext'
import Toast from './Toast'
import { Box } from '@mui/material'

const ToastContainer: React.FC = () => {
  const context = useContext(ToastContext)

  if (!context) {
    return null
  }

  const { toasts, removeToast } = context

  return (
    <Box
      sx={{
        position: 'fixed',
        zIndex: 1400,
        right: (theme) => theme.spacing(3),
        bottom: (theme) => theme.spacing(3),
      }}
    >
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          severity={toast.severity}
          duration={toast.duration}
          onClose={removeToast}
          index={index}
        />
      ))}
    </Box>
  )
}

export default ToastContainer
