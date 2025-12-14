export interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  timestamp: string
  url: string
}

export interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
}
