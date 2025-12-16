'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { BluetoothHRMProvider } from '@/context/BluetoothHRMContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider>
        <BluetoothHRMProvider>{children}</BluetoothHRMProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
