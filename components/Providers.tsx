'use client'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'

import { WebSocketProvider } from '@/context/WebSocketContext'
import theme from '@/lib/theme'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
