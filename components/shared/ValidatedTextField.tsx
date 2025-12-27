'use client'

import React from 'react'
import { TextField, type TextFieldProps } from '@mui/material'
import { validate } from '@/utils/validation'
import {
  ValidationRule,
  ValidationRuleType,
} from '@/types/validation'

export interface ValidatedTextFieldProps
  extends Omit<TextFieldProps, 'error' | 'helperText'> {
  validationRules?: ValidationRule[]
  errorMessageOverrides?: Partial<Record<ValidationRuleType, string>>
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
  const [touched, setTouched] = React.useState(false)

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

    if (touched) {
      setError(isValid ? null : message)
    }

    if (onValidation) {
      onValidation(isValid)
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleValidation(event.target.value)
    if (props.onChange) {
      props.onChange(event)
    }
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true)
    handleValidation(event.target.value)
    if (props.onBlur) {
      props.onBlur(event)
    }
  }

  // Re-validate when the value changes externally
  React.useEffect(() => {
    if (touched) {
      handleValidation(props.value as string)
    }
  }, [props.value, touched])

  const a11yProps = {
    'aria-invalid': !!error,
    'aria-describedby': !!error ? `${props.id}-error-text` : undefined,
  }

  return (
    <TextField
      {...props}
      error={!!error}
      helperText={error}
      onChange={handleChange}
      onBlur={handleBlur}
      inputProps={{ ...props.inputProps, ...a11yProps }}
      FormHelperTextProps={{
        ...props.FormHelperTextProps,
        id: a11yProps['aria-describedby'],
      }}
    />
  )
}

export default ValidatedTextField
