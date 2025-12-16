'use client'

import { SessionProvider } from 'next-auth/react'

import { WebSocketProvider } from '@/context/WebSocketContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </SessionProvider>
  )
}
