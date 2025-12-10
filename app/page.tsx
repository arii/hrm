// File: app/page.tsx (Main Viewer Dashboard - Now a Server Component)
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth' // Assuming auth options are in lib/auth
import DashboardClient from './DashboardClient'
import { HrmStaticMetadata } from '@/types/shared'

async function getStaticMetadata(): Promise<HrmStaticMetadata | undefined> {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    return undefined
  }

  // Assuming session.user has name and age.
  // You might need to adjust this based on your actual session user object.
  const { name, age } = session.user
  const userAge = typeof age === 'number' ? age : 30 // Default age if not provided
  const maxHr = 220 - userAge

  return {
    clientId: session.user.id || 'default-user-id', // Assuming user has an id
    name: name || 'Anonymous',
    age: userAge,
    maxHr,
  }
}

const DashboardPage = async () => {
  const staticMetadata = await getStaticMetadata()

  return <DashboardClient staticMetadata={staticMetadata} />
}

export default DashboardPage
