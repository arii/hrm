'use client'

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Snackbar, Alert } from '@mui/material'

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
    },
    []
  )

  const handleClose = (
    id: string,
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === 'clickaway') {
      return
    }
    removeError(id)
  }

  return (
    <ErrorContext.Provider value={{ errors, addError, removeError }}>
      {children}
      {errors.map((error) => (
        <Snackbar
          key={error.id}
          open={true}
          autoHideDuration={error.type === 'transient' ? 5000 : null}
          onClose={(event, reason) => handleClose(error.id, event, reason)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(error.id)}
            severity="error"
            variant="filled"
            sx={{ width: '100%' }}
          >
            {error.message}
          </Alert>
        </Snackbar>
      ))}
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
