'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from '@/context/ToastContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <ToastProvider>{children}</ToastProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
