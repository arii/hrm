// File: app/page.tsx (Main Viewer Dashboard)
import DashboardClient from './DashboardClient'

// TODO: Replace with a server-side fetch from a CMS or configuration file
const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'
const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

export default async function DashboardPage() {
  // Example of fetching server-side data
  const useNativeTable = process.env.NEXT_PUBLIC_USE_NATIVE_TABLE === 'true'

  return (
    <DashboardClient
      docUrl={DOC_URL}
      docId={DOC_ID}
      useNativeTable={useNativeTable}
    />
  )
}
