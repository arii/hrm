import DashboardClient from '@/components/DashboardClient'
import { env } from '@/lib/env'
import { extractGoogleDocId } from '@/lib/utils'

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

interface DashboardPageParams {
  'test-error'?: string | string[] | undefined
}

interface DashboardPageEnv {
  NODE_ENV: string
  NEXT_PUBLIC_WS_URL?: string | undefined
  CI?: string | undefined
  TESTING?: string | undefined
}

interface DashboardClientProps {
  triggerError: boolean
}

const firstParam = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value)

// Test-hook (?test-error) param mapping. Pure: unit-tested. Intentional
// errors only fire in testable environments (dev, localhost WS, CI, or
// TESTING).
export const resolveDashboardProps = (
  params: DashboardPageParams,
  env: DashboardPageEnv
): DashboardClientProps => {
  const testErrorValue = firstParam(params['test-error'])
  const isTestableEnv =
    env.NODE_ENV !== 'production' ||
    env.NEXT_PUBLIC_WS_URL?.includes('localhost') ||
    env.CI === 'true' ||
    env.TESTING === 'true' ||
    false
  return {
    triggerError: isTestableEnv && testErrorValue === 'true',
  }
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const props = resolveDashboardProps(await searchParams, env)
  const docId = extractGoogleDocId(env.GOOGLE_DOC_WORKOUT_URL)

  return <DashboardClient docId={docId} triggerError={props.triggerError} />
}
