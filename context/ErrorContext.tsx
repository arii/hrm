'use client'

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react'

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

// Simple ID generator
const generateId = () => `error-${Date.now()}-${Math.random()}`

export const ErrorProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([])

  const removeError = useCallback((id: string) => {
    setErrors((prevErrors) => prevErrors.filter((error) => error.id !== id))
  }, [])

  const addError = useCallback(
    (message: string, type: 'transient' | 'persistent' = 'transient') => {
      const newError: ErrorInfo = { id: generateId(), message, type }
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
