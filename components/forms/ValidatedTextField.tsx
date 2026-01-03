import React, { useState } from 'react'
import TextField, { TextFieldProps } from '@mui/material/TextField'
import { z, ZodIssue } from 'zod'

// Define the props for the ValidatedTextField component
export type ValidatedTextFieldProps = TextFieldProps & {
  schema: z.AnyZodObject
  fieldName: string
}

const ValidatedTextField: React.FC<ValidatedTextFieldProps> = ({
  schema,
  fieldName,
  onBlur,
  ...props
}) => {
  const [error, setError] = useState<string | null>(null)

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const { value } = event.target
    // We create a temporary object to validate against the schema,
    // as the schema expects an object with a property `fieldName`.
    const validationResult = schema.safeParse({ [fieldName]: value })

    if (!validationResult.success) {
      // Find the specific error for this field
      const fieldError = validationResult.error.issues.find(
        (issue: ZodIssue) => issue.path[0] === fieldName
      )
      if (fieldError) {
        setError(fieldError.message)
      }
    } else {
      setError(null)
    }

    // Call the original onBlur handler if it exists
    if (onBlur) {
      onBlur(event)
    }
  }

  return (
    <TextField
      {...props}
      onBlur={handleBlur}
      error={!!error}
      helperText={error || props.helperText}
    />
  )
}

export default ValidatedTextField
