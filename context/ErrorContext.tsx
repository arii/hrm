'use client'

import React, { createContext, useContext, ReactNode, useCallback } from 'react'
import { showError } from '@/lib/notifications'

interface ErrorContextType {
  addError: (message: string) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const addError = useCallback((message: string) => {
    showError(message)
  }, [])

  return (
    <ErrorContext.Provider value={{ addError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export const useError = (): ErrorContextType => {
  const context = useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}
