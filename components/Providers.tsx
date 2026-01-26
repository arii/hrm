'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import TokenSync from './TokenSync'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <TokenSync />
      <AudioProvider>
        <WebSocketProvider>{children}</WebSocketProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
