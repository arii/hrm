'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Alert, Container } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
          <Alert severity="error">
            A critical error occurred while rendering the page.
          </Alert>
        </Container>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
