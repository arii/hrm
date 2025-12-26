'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { SpotifyProvider } from '@/context/SpotifyContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <WebSocketProvider>
          <SpotifyProvider>{children}</SpotifyProvider>
        </WebSocketProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
