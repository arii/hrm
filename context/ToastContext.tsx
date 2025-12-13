'use client'

import React, { createContext, useState, useCallback, ReactNode } from 'react'
import { AlertColor } from '@mui/material/Alert'

export interface ToastMessage {
  id: number
  message: string
  severity: AlertColor
  duration?: number
}

interface ToastContextType {
  toasts: ToastMessage[]
  addToast: (
    message: string,
    severity: AlertColor,
    duration?: number
  ) => void
  removeToast: (id: number) => void
}

export const ToastContext = createContext<ToastContextType | undefined>(
  undefined
)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = useCallback(
    (message: string, severity: AlertColor, duration: number = 6000) => {
      const id = new Date().getTime()
      setToasts((prevToasts) => [...prevToasts, { id, message, severity, duration }])
    },
    []
  )

  const removeToast = useCallback((id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}
