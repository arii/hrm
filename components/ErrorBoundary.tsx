'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { VRT_TEST_ERROR_MESSAGE } from '@/constants/vrt'

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
    // Suppress logging for intentional VRT errors to keep test logs clean.
    if (error.message === VRT_TEST_ERROR_MESSAGE) {
      return
    }
    console.error('Uncaught error:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback
    }

    return this.props.children
  }
}

export default ErrorBoundary
