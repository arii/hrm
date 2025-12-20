'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback: ReactNode
}

interface State {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      // In a real application, you might add user info, session ID, etc.
      // E.g., user: { id: '...', name: '...' }
    }
    // In a production environment, you would send `errorDetails` to a dedicated error reporting service.
    // Example:
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.captureException(error, { extra: errorDetails });
    console.error('ErrorBoundary caught an error:', JSON.stringify(errorDetails, null, 2))
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export default ErrorBoundary
