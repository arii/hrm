'use client'
import React from 'react'
import { Box, Typography, Button } from '@mui/material'
import type { ErrorInfo } from 'react'
import type { ErrorReport } from '@/types/error'

export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  { hasError: boolean; error?: Error }
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
    this.reportError(error, errorInfo)
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    const errorReport: ErrorReport = {
      message: error.message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    }

    if (error.stack) {
      errorReport.stack = error.stack
    }

    if (errorInfo.componentStack) {
      errorReport.componentStack = errorInfo.componentStack
    }

    console.error('Error Report:', errorReport)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            p: 3,
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We've encountered an unexpected error. Your workout data is safe.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ mb: 2 }}
          >
            Reload Application
          </Button>
          <Button
            variant="text"
            onClick={() => this.setState({ hasError: false })}
          >
            Try Again
          </Button>
        </Box>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
