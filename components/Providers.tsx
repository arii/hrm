'use client'

import { AudioProvider } from '@/context/AudioContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WorkoutProvider } from '@/context/WorkoutContext'
import { SnackbarProvider } from 'notistack'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <SnackbarProvider>
        <UserSettingsProvider>
          <AudioProvider>
            <WebSocketProvider>
              <WorkoutProvider>{children}</WorkoutProvider>
            </WebSocketProvider>
          </AudioProvider>
        </UserSettingsProvider>
      </SnackbarProvider>
    </SessionProvider>
  )
}
