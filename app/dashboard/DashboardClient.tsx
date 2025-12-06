// File: app/dashboard/DashboardClient.tsx (Client Component)

'use client'
import { useWebSocket } from '@/context/WebSocketContext'
import { HrmStaticMetadata } from '@/types/shared'

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

  // ... rest of the client UI logic using real-time data from unifiedState
  return (
    <div>
      <h1>Welcome, {userName}</h1>
      <HeartRateZones maxHr={staticMetadata.maxHr} />
      {/* ... other real-time components */}
    </div>
  )
}
