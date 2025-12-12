// File: app/page.tsx (Dashboard Server Component)
import { authOptions } from '@/lib/auth'
import DashboardClient from './DashboardClient'
import { getServerSession } from 'next-auth/next'

/**
 * Renders the main dashboard page.
 * This is a server component that fetches the session and passes it to the client boundary.
 * @returns {Promise<JSX.Element>} The rendered dashboard page.
 */
const DashboardPage = async () => {
  const session = await getServerSession(authOptions)

  return <DashboardClient session={session} />
}

export default DashboardPage
