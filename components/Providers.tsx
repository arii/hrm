'use client'

import { AudioProvider } from '@/context/AudioContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

import { ThemeRegistry } from '../ThemeRegistry/ThemeRegistry'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <ThemeProvider>
        <ThemeRegistry>
          <AudioProvider>
            <WebSocketProvider>{children}</WebSocketProvider>
          </AudioProvider>
        </ThemeRegistry>
      </ThemeProvider>
    </SessionProvider>
  )
}
