'use client'

import { AudioProvider } from '@/context/AudioContext'
import { SpotifyProvider } from '@/context/SpotifyContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <SpotifyProvider>
        <AudioProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </AudioProvider>
      </SpotifyProvider>
    </SessionProvider>
  )
}
