'use client'

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react'
import { v4 as uuidv4 } from 'uuid'

interface ErrorInfo {
  id: string
  message: string
  type: 'transient' | 'persistent'
}

interface ErrorContextType {
  errors: ErrorInfo[]
  addError: (message: string, type?: 'transient' | 'persistent') => void
  removeError: (id: string) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([])

  const removeError = useCallback((id: string) => {
    setErrors((prevErrors) => prevErrors.filter((error) => error.id !== id))
  }, [])

  const addError = useCallback(
    (message: string, type: 'transient' | 'persistent' = 'transient') => {
      const newError: ErrorInfo = { id: uuidv4(), message, type }
      setErrors((prevErrors) => [...prevErrors, newError])

      if (type === 'transient') {
        setTimeout(() => {
          removeError(newError.id)
        }, 5000) // 5 seconds for transient errors
      }
    },
    [removeError]
  )

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError }}>
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
