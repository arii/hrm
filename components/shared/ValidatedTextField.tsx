'use client'

import React from 'react'
import { TextField, type TextFieldProps } from '@mui/material'
import { validate } from '@/utils/validation'

// Define validation rule types
export type ValidationRule =
  | 'required'
  | 'email'
  | 'positiveInteger'
  | { minLength: number }

export interface ValidatedTextFieldProps
  extends Omit<TextFieldProps, 'error' | 'helperText'> {
  validationRules?: ValidationRule[]
  errorMessageOverrides?: Partial<Record<string, string>>
  onValidation?: (isValid: boolean) => void
}

/**
 * A TextField component with built-in validation.
 */
const ValidatedTextField: React.FC<ValidatedTextFieldProps> = ({
  validationRules = [],
  errorMessageOverrides = {},
  onValidation,
  ...props
}) => {
  const [error, setError] = React.useState<string | null>(null)

  const handleValidation = (value: string) => {
    if (validationRules.length === 0) {
      if (onValidation) onValidation(true)
      return
    }

    const { isValid, message } = validate(
      value,
      validationRules,
      errorMessageOverrides
    )
    setError(isValid ? null : message)
    if (onValidation) onValidation(isValid)
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleValidation(event.target.value)
    if (props.onChange) {
      props.onChange(event)
    }
  }

  // Initial validation on mount
  React.useEffect(() => {
    handleValidation(props.value as string)
  }, [props.value])

  return (
    <TextField
      {...props}
      error={!!error}
      helperText={error}
      onChange={handleChange}
    />
  )
}

export default ValidatedTextField
