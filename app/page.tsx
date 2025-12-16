// File: app/page.tsx (Main Viewer Dashboard)
import DashboardClient from './DashboardClient'
import { env } from '@/lib/env'

// TODO: Replace with a server-side fetch from a CMS or configuration file
const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'
const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

export default async function DashboardPage() {
  /**
   * SSR Data Fetching Strategy:
   *
   * This page component is a Server Component, meaning it runs on the server during the initial request.
   * The `useNativeTable` flag is fetched from server-side environment variables using a Zod schema
   * for validation and type safety.
   *
   * Currently, the document URL and ID are hardcoded. In a real-world scenario, this data
   * would be fetched from a CMS, database, or external API.
   */
  const useNativeTable = env.NEXT_PUBLIC_USE_NATIVE_TABLE

  return (
    <DashboardClient
      docUrl={DOC_URL}
      docId={DOC_ID}
      useNativeTable={useNativeTable}
    />
  )
}
