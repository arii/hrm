'use client'

import { AudioProvider } from '@/context/AudioContext'
import { SpotifyDevicesProvider } from '@/context/SpotifyDevicesContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <SpotifyDevicesProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </SpotifyDevicesProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
