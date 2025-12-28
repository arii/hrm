'use client'

import { AudioProvider } from '@/context/AudioContext'
import { BluetoothProvider } from '@/context/BluetoothContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <BluetoothProvider>
          <WebSocketProvider>{children}</WebSocketProvider>
        </BluetoothProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
