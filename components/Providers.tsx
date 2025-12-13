'use client'

import { ToastProvider } from '@/context/ToastContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'
import ToastContainer from './shared/ToastContainer'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <ToastProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
            <ToastContainer />
          </ThemeProvider>
        </ToastProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
