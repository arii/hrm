'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { UserPhysicalProfileProvider } from '@/context/UserPhysicalProfileContext' //
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <UserPhysicalProfileProvider> {/* Added Provider */}
        <AudioProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </AudioProvider>
      </UserPhysicalProfileProvider>
    </SessionProvider>
  )
}
