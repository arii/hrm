// File: app/client/connect/page.tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import Loading from '../../../components/Loading'

// Dynamically import the ConnectPage component to ensure it's client-side only
const ConnectPageClient = dynamic(
  () => import('../../../components/ConnectPageClient'),
  {
    ssr: false,
    loading: () => <Loading message="Loading connection manager..." />,
  }
)

export default function ConnectPage() {
  return (
    <Suspense fallback={<Loading message="Loading connection manager..." />}>
      <ConnectPageClient />
    </Suspense>
  )
}
