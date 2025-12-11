'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { HrmStaticMetadata } from '@/types/shared'
import theme from '@/lib/theme'
import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { SessionProvider } from 'next-auth/react'

export default function Providers({
  children,
  initialHrmData,
}: {
  children: React.ReactNode
  initialHrmData?: HrmStaticMetadata[]
}) {
  const hrmClients = initialHrmData
    ? initialHrmData.map((data) => ({ ...data, value: 0 }))
    : []

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={true}>
      <WebSocketProvider initialHrmData={hrmClients}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </WebSocketProvider>
    </SessionProvider>
  )
}
