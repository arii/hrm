'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import ThemeRegistry from './ThemeRegistry/ThemeRegistry'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeRegistry options={{ key: 'mui' }}>
        <WebSocketProvider>{children}</WebSocketProvider>
      </ThemeRegistry>
    </SessionProvider>
  )
}
