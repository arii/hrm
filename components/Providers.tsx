'use client'

import { ConnectivityProvider } from '@/context/ConnectivityContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <ConnectivityProvider>
        <WebSocketProvider>{children}</WebSocketProvider>
      </ConnectivityProvider>
    </SessionProvider>
  )
}
