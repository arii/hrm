import DashboardClient from '@/components/DashboardClient'
import { env } from '@/lib/env'
import { extractGoogleDocId } from '@/lib/utils'

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = await searchParams
  const nativeParam = params.native
  const nativeValue = Array.isArray(nativeParam) ? nativeParam[0] : nativeParam

  // Check for URL overrides (useful for testing/VRT)
  const iframeUrlOverride = Array.isArray(params.iframeUrl)
    ? params.iframeUrl[0]
    : params.iframeUrl
  const workoutUrlOverride = Array.isArray(params.workoutUrl)
    ? params.workoutUrl[0]
    : params.workoutUrl

  const useNativeTable =
    nativeValue === 'true' ||
    (env.NEXT_PUBLIC_USE_NATIVE_TABLE && nativeValue !== 'false')

  // Check for test-error
  const testErrorParam = params['test-error']
  const testErrorValue = Array.isArray(testErrorParam)
    ? testErrorParam[0]
    : testErrorParam

  // Only allow intentional errors in development or test environments.
  const isTestableEnv =
    process.env.NODE_ENV !== 'production' ||
    env.NEXT_PUBLIC_WS_URL?.includes('localhost') ||
    env.CI === 'true' ||
    env.TESTING === 'true' ||
    false

  // Fallback to mock URLs in test environments if not configured
  const DEFAULT_MOCK_WORKOUT_URL =
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
  const DEFAULT_MOCK_IFRAME_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

  const iframeUrl =
    iframeUrlOverride ||
    env.GOOGLE_DOC_IFRAME_URL ||
    (isTestableEnv ? DEFAULT_MOCK_IFRAME_URL : undefined)
  const workoutUrl =
    workoutUrlOverride ||
    env.GOOGLE_DOC_WORKOUT_URL ||
    (isTestableEnv ? DEFAULT_MOCK_WORKOUT_URL : undefined)

  const docId = extractGoogleDocId(workoutUrl)

  return (
    <DashboardClient
      useNativeTable={useNativeTable}
      docId={docId}
      iframeUrl={iframeUrl}
      triggerError={isTestableEnv && testErrorValue === 'true'}
    />
  )
}
