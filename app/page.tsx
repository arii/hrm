// File: app/page.tsx (Server Component Wrapper)
/**
 * Server Component: Gets the Google Doc URLs from environment variables
 * and determines which display mode to use (native table or iframe).
 */
import { getGoogleDocUrl, getGoogleDocIframeUrl } from '@/lib/docIdExtractor'
import ClientDashboard from './page.client'

const DEFAULT_DOC_URL =
  'https://docs.google.com/document/d/1aLn_N1UheWVFKSVQtfBkgQbVDvHNbjVSH9ie3o_trYo/edit?usp=sharing'

interface PageProps {
  mode?: 'table' | 'iframe'
}

export default function Page({ mode = 'table' }: PageProps) {
  const tableDocUrl = getGoogleDocUrl() || DEFAULT_DOC_URL
  const iframeUrl = getGoogleDocIframeUrl()
  const useIframe = !!(mode === 'iframe' && iframeUrl)

  return (
    <ClientDashboard
      tableDocUrl={tableDocUrl}
      iframeUrl={iframeUrl}
      useIframe={useIframe}
    />
  )
}
