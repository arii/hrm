// File: app/dashboard/page.tsx (Server Component)

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DashboardClient } from './DashboardClient'
import { HrmStaticMetadata } from '@/types/shared'

async function getStaticHrmData(userId: string): Promise<HrmStaticMetadata> {
  // --- Replace this with your actual DB/API fetch logic ---
  // In a real HRM system, this data would come from a PostgreSQL/MongoDB/etc.
  return {
    clientId: userId,
    maxHr: 185, // Example: based on age or stored profile
    name: "Arii Streamer",
    age: 35
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    // Handle unauthenticated state (redirect or show login component)
    return <div>Authentication Required</div>
  }

  const staticData = await getStaticHrmData(session.user.id)

  // Pass static data as props to the client component
  return (
    <DashboardClient staticMetadata={staticData} />
  )
}
