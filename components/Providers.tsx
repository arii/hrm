'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/context/ThemeContext' // Import the new ThemeProvider

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
        <WebSocketProvider>{children}</WebSocketProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
