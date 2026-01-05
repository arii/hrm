'use client'

import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '@/theme/theme'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import { SessionProvider } from 'next-auth/react'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

export default function VerifyProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SessionProvider>
          <UserSettingsProvider>{children}</UserSettingsProvider>
        </SessionProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}
