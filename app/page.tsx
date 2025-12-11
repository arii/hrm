// File: app/page.tsx (Server Component Entry Point)
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import DashboardClient from './DashboardClient'
import { HrmStaticMetadata } from '@/types/shared'

/**
 * Server Component responsible for fetching initial data and passing it
 * to the client-side Dashboard component.
 */
const DashboardPage = async () => {
  const session = await getServerSession(authOptions)

  // In a real application, you would fetch this data from a database
  // using the user's session information. For this example, we'll
  // create some mock static data.
  const initialHrmData: HrmStaticMetadata[] = []
  if (session?.user) {
    initialHrmData.push({
      clientId: session.user.id, // Use a stable ID from the session
      name: session.user.name || 'User',
      age: 30, // Placeholder age
      maxHr: 190, // Placeholder max HR
    })
  }

  return <DashboardClient initialHrmData={initialHrmData} />
}

export default DashboardPage
