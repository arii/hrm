'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <UserSettingsProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </UserSettingsProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
