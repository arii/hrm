'use client'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserSettingsProvider>
        <WebSocketProvider>{children}</WebSocketProvider>
      </UserSettingsProvider>
    </SessionProvider>
  )
}
