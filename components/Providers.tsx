'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SpotifyPlayerProvider } from '@/context/SpotifyPlayerContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <SpotifyPlayerProvider initialVolume={0.7}>
          <WebSocketProvider>{children}</WebSocketProvider>
        </SpotifyPlayerProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
