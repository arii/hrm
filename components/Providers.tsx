'use client'

import { AppStateProvider } from '@/context/AppStateContext'
import { ConnectionProvider } from '@/context/ConnectionContext'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AppStateProvider>
        <ConnectionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </ConnectionProvider>
      </AppStateProvider>
    </SessionProvider>
  )
}
