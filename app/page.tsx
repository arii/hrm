import DashboardClient from '@/components/DashboardClient'
import { env } from '@/lib/env'
import { extractGoogleDocId } from '@/lib/utils'

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

interface DashboardPageParams {
  native?: string | string[] | undefined
  'test-error'?: string | string[] | undefined
}

interface DashboardPageEnv {
  NEXT_PUBLIC_USE_NATIVE_TABLE: boolean
  NODE_ENV: string
  NEXT_PUBLIC_WS_URL?: string | undefined
  CI?: string | undefined
  TESTING?: string | undefined
}

interface DashboardClientProps {
  useNativeTable: boolean
  triggerError: boolean
}

const firstParam = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value)

// Test-hook (?test-error) and native-table (?native) param mapping.
// Pure: unit-tested. Intentional errors only fire in testable
// environments (dev, localhost WS, CI, or TESTING).
export const resolveDashboardProps = (
  params: DashboardPageParams,
  env: DashboardPageEnv
): DashboardClientProps => {
  const nativeValue = firstParam(params.native)
  const testErrorValue = firstParam(params['test-error'])
  const isTestableEnv =
    env.NODE_ENV !== 'production' ||
    env.NEXT_PUBLIC_WS_URL?.includes('localhost') ||
    env.CI === 'true' ||
    env.TESTING === 'true' ||
    false
  return {
    useNativeTable:
      nativeValue === 'true' ||
      (env.NEXT_PUBLIC_USE_NATIVE_TABLE && nativeValue !== 'false'),
    triggerError: isTestableEnv && testErrorValue === 'true',
  }
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const props = resolveDashboardProps(await searchParams, env)
  const docId = extractGoogleDocId(env.GOOGLE_DOC_WORKOUT_URL)

  return (
    <DashboardClient
      useNativeTable={props.useNativeTable}
      docId={docId}
      iframeUrl={env.GOOGLE_DOC_IFRAME_URL}
      triggerError={props.triggerError}
    />
  )
}
