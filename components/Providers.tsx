'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { ToastProvider } from '@/context/ToastContext'
import ThemeRegistry from './ThemeRegistry/ThemeRegistry'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <ToastProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </ToastProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
