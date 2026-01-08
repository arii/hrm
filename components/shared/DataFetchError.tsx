// components/shared/DataFetchError.tsx
'use client'

import { Alert, Button } from '@mui/material'

interface DataFetchErrorProps {
  errorMessage: string
  onRetry: () => void
}

export default function DataFetchError({
  errorMessage,
  onRetry,
}: DataFetchErrorProps) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {errorMessage}
    </Alert>
  )
}
