'use client'

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react'
import { AlertColor } from '@mui/material/Alert'

interface ToastInfo {
  id: string
  message: string
  severity: AlertColor
}

interface ToastContextType {
  toasts: ToastInfo[]
  addToast: (message: string, severity?: AlertColor) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastInfo[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, severity: AlertColor = 'info') => {
      const newToast: ToastInfo = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        severity,
      }
      setToasts((prevToasts) => [...prevToasts, newToast])
    },
    []
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
