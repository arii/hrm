import DashboardClient from '@/components/DashboardClient'
import { env } from '@/lib/env'

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = await searchParams
  const nativeParam = params.native
  const nativeValue = Array.isArray(nativeParam) ? nativeParam[0] : nativeParam

  const useNativeTable =
    nativeValue === 'true' ||
    (env.NEXT_PUBLIC_USE_NATIVE_TABLE && nativeValue !== 'false')

  // Check for test-error
  const testErrorParam = params['test-error']
  const testErrorValue = Array.isArray(testErrorParam)
    ? testErrorParam[0]
    : testErrorParam

  const testingParam = params.testing
  const testingValue = Array.isArray(testingParam)
    ? testingParam[0]
    : testingParam

  // Only allow intentional errors in development or test environments.
  // Note: testingValue is from query params and is not used as a primary guard
  // to prevent intentional crashes in production via URL manipulation.
  const isTestableEnv =
    process.env.NODE_ENV !== 'production' ||
    env.NEXT_PUBLIC_WS_URL?.includes('localhost') ||
    env.CI === 'true' ||
    env.TESTING === 'true' ||
    false

  return (
    <DashboardClient
      useNativeTable={useNativeTable}
      triggerError={isTestableEnv && testErrorValue === 'true'}
    />
  )
}
