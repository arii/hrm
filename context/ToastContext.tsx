'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { Toast as ToastComponent } from '@/components/Toast'
import { Toast, ToastType } from '@/types/toast'
import { Box } from '@mui/material'

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback(
    (message: string, type: ToastType, duration?: number) => {
      const newToast: Toast = {
        id: Date.now(),
        message,
        type,
        duration,
      }
      setToasts((prevToasts) => [...prevToasts, newToast])
    },
    []
  )

  const handleClose = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        {toasts.map((toast) => (
          <ToastComponent key={toast.id} toast={toast} onClose={handleClose} />
        ))}
      </Box>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
