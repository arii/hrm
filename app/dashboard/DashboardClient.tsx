// File: app/dashboard/DashboardClient.tsx (Client Component)

'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { HrmStaticMetadata } from '@/types/shared'
import { useEffect } from 'react'

interface DashboardClientProps {
  staticMetadata: HrmStaticMetadata
}

function HeartRateZones({ maxHr }: { maxHr: number }) {
  return <div>Max HR: {maxHr}</div>
}

export function DashboardClient({ staticMetadata }: DashboardClientProps) {
  // The hook consumes the initial static data for client-side calculations
  useWebSocket(staticMetadata)

  // Example: Display the user's name from the static data
  const userName = staticMetadata.name || 'User'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
    }
  }, [])

  // ... rest of the client UI logic using real-time data from unifiedState
  return (
    <div data-testid="dashboard-container">
      <h1>Welcome, {userName}</h1>
      <HeartRateZones maxHr={staticMetadata.maxHr} />
      {/* ... other real-time components */}
    </div>
  )
}
