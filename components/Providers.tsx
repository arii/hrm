'use client'

import { WebSocketProvider } from '@/context/WebSocketContext'
import { SessionProvider } from 'next-auth/react'
import { getBasePath } from '@/utils/urls'

export default function Providers({ children }: { children: React.ReactNode }) {
  // next-auth/react does not follow Next.js basePath on its own: without
  // this it fetches /api/auth/* from the site root, escaping any subpath.
  const authBasePath = `${getBasePath()}/api/auth`
  return (
    <SessionProvider
      basePath={authBasePath}
      refetchInterval={0}
      refetchOnWindowFocus={true}
    >
      <WebSocketProvider>{children}</WebSocketProvider>
    </SessionProvider>
  )
}
