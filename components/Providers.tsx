'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { SnackbarProvider } from 'notistack'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <SnackbarProvider maxSnack={3}>{children}</SnackbarProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
