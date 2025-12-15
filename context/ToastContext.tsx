'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react'
import { AlertColor } from '@mui/material/Alert'
import { v4 as uuidv4 } from 'uuid'

export interface ToastState {
  id: string
  message: string
  severity: AlertColor
  open: boolean
}

interface ToastContextType {
  toasts: ToastState[]
  showToast: (message: string, severity?: AlertColor) => void
  hideToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastState[]>([])

  const showToast = useCallback(
    (message: string, severity: AlertColor = 'info') => {
      const newToast: ToastState = {
        id: uuidv4(),
        message,
        severity,
        open: true,
      }
      setToasts((prevToasts) => [...prevToasts, newToast])
    },
    []
  )

  const hideToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const value = { toasts, showToast, hideToast }

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
