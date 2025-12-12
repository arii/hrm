'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { ErrorProvider } from '@/context/ErrorContext'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'
import ErrorDisplay from './ErrorDisplay'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <ErrorProvider>
        <WebSocketProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
            <ErrorDisplay />
          </ThemeProvider>
        </WebSocketProvider>
      </ErrorProvider>
    </SessionProvider>
  )
}
