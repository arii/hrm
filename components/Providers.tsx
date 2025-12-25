'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { SpotifyDevicesProvider } from '@/context/SpotifyDevicesContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <WebSocketProvider>
          <SpotifyDevicesProvider>{children}</SpotifyDevicesProvider>
        </WebSocketProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
