'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'
import { ConnectionStatus } from './ConnectionStatus'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <ConnectionStatus />
          {children}
        </ThemeProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
