'use client'

import { ErrorProvider } from '@/context/ErrorContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorProvider>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
        <WebSocketProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </WebSocketProvider>
      </SessionProvider>
    </ErrorProvider>
  )
}
