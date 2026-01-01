// components/shared/Form/ValidatedTextField.tsx
import TextField, { TextFieldProps } from '@mui/material/TextField'
import React, { useCallback, useEffect, useState } from 'react'
import { ZodIssue, ZodSchema } from 'zod'
import { validate } from '@/utils/validation'

// Exclude props that will be managed internally by the component
type ValidatedTextFieldProps = Omit<
  TextFieldProps,
  'onChange' | 'value' | 'error' | 'helperText'
> & {
  id: string
  value: string
  onStateChanged: (
    id: string,
    value: string,
    isValid: boolean,
    issues: ZodIssue[]
  ) => void
  validationSchema: ZodSchema
  validationDependencies?: unknown[]
  debounceTimeout?: number
}

const ValidatedTextField: React.FC<ValidatedTextFieldProps> = ({
  id,
  value,
  onStateChanged,
  validationSchema,
  validationDependencies = [],
  debounceTimeout = 500,
  ...rest
}) => {
  const [inputValue, setInputValue] = useState(value)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleValidation = useCallback(() => {
    const { success, issues } = validate(inputValue, validationSchema)
    if (success) {
      setError(null)
      setIsSuccess(true)
      onStateChanged(id, inputValue, true, [])
    } else {
      setError(issues[0].message)
      setIsSuccess(false)
      onStateChanged(id, inputValue, false, issues)
    }
  }, [inputValue, validationSchema, id, onStateChanged])

  useEffect(() => {
    const handler = setTimeout(() => {
      handleValidation()
    }, debounceTimeout)

    return () => {
      clearTimeout(handler)
    }
  }, [inputValue, debounceTimeout, handleValidation])

  // Re-validate when external dependencies change
  useEffect(() => {
    handleValidation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...validationDependencies, handleValidation])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setIsSuccess(false) // Reset success state on change
  }

  return (
    <TextField
      {...rest}
      value={inputValue}
      onChange={handleChange}
      onBlur={handleValidation}
      error={!!error}
      helperText={error}
      color={isSuccess ? 'success' : undefined}
      sx={{
        ...rest.sx,
        ...(isSuccess && {
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
            {
              borderColor: 'success.main',
            },
        }),
      }}
    />
  )
}

export default ValidatedTextField
