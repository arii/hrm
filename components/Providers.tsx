'use client'

import { LoadingProvider } from '@/context/LoadingContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <ThemeProvider theme={theme}>
          <LoadingProvider>
            <CssBaseline />
            {children}
          </LoadingProvider>
        </ThemeProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
