'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { WorkoutSessionProvider } from '@/context/WorkoutSessionContext'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <WorkoutSessionProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </WorkoutSessionProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
