// components/AppProviders.tsx
import React from 'react'
import Providers from '@/components/Providers'
import TimerSoundProvider from '@/components/TimerSoundProvider'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

interface AppProvidersProps {
  children: React.ReactNode
}

const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <Providers>
      <UserSettingsProvider>
        <TimerSoundProvider>{children}</TimerSoundProvider>
      </UserSettingsProvider>
    </Providers>
  )
}

export default AppProviders
