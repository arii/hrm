'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { BluetoothTestProvider } from '@/context/BluetoothTestContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <AudioProvider>
        <WebSocketProvider>
          <BluetoothTestProvider>{children}</BluetoothTestProvider>
        </WebSocketProvider>
      </AudioProvider>
    </SessionProvider>
  )
}
