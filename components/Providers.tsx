'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { AppThemeProvider } from '@/context/ThemeContext'
import CssBaseline from '@mui/material/CssBaseline'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <WebSocketProvider>
        <AppThemeProvider>
          <CssBaseline />
          {children}
        </AppThemeProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
