// context/ToastContext.tsx
'use client'

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react'
import { AlertColor } from '@mui/material'
import ToastContainer from '@/components/Toast/ToastContainer'

export interface Toast {
  id: number
  message: string
  severity: AlertColor
  duration?: number
}

// The context will only expose the function to add a toast.
interface ToastContextType {
  addToast: (message: string, severity: AlertColor, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// The ToastProvider now manages and renders the toasts.
export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const addToast = useCallback(
    (message: string, severity: AlertColor, duration: number = 6000) => {
      const id = toastId.current++
      setToasts((prevToasts) => [
        ...prevToasts,
        { id, message, severity, duration },
      ])
    },
    []
  )

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}
