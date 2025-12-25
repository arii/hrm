'use client'

import { AudioProvider } from '@/context/AudioContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <WebSocketProvider>
          <UserSettingsProvider>{children}</UserSettingsProvider>
        </WebSocketProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
