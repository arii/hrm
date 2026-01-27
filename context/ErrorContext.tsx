'use client'

import { showError } from '@/lib/notifications'
import React, {
  createContext,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from 'react'

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

  const contextValue = useMemo(() => ({ addError }), [addError])

  return (
    <ErrorContext.Provider value={contextValue}>
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
