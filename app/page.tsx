// File: app/page.tsx
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import DashboardClient from './DashboardClient'
import { HrmStaticMetadata } from '@/types/shared'

const DashboardPage = async () => {
  const session = await getServerSession(authOptions)
  let staticMetadata: HrmStaticMetadata | undefined

  if (session?.user) {
    const age = session.user.age || 30 // Default age if not provided
    staticMetadata = {
      clientId: session.user.id,
      name: session.user.name || 'Anonymous',
      age: age,
      maxHr: 220 - age,
    }
  }

  return <DashboardClient staticMetadata={staticMetadata} />
}

export default DashboardPage
