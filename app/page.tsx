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

  // Check for test-error - only allowed in non-production or test environments
  const testErrorParam = params['test-error']
  const testErrorValue = Array.isArray(testErrorParam)
    ? testErrorParam[0]
    : testErrorParam

  const isTestableEnv =
    env.NODE_ENV !== 'production' ||
    env.TESTING === 'true' ||
    env.CI === 'true' ||
    params.testing === 'true'

  if (testErrorValue === 'true' && isTestableEnv) {
    throw new Error('VRT Test Error')
  }

  return <DashboardClient useNativeTable={useNativeTable} />
}
