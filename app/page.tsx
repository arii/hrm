import DashboardClient from '@/components/DashboardClient'

interface DashboardProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function Dashboard({ searchParams }: DashboardProps) {
  const params = await searchParams
  const nativeParam = params.native
  const nativeValue = Array.isArray(nativeParam) ? nativeParam[0] : nativeParam

  const useNativeTable =
    nativeValue === 'true' ||
    (process.env.NEXT_PUBLIC_USE_NATIVE_TABLE === 'true' &&
      nativeValue !== 'false')

  // Check for test-error
  const testErrorParam = params['test-error']
  const testErrorValue = Array.isArray(testErrorParam)
    ? testErrorParam[0]
    : testErrorParam

  if (testErrorValue === 'true') {
    throw new Error('VRT Test Error')
  }

  return <DashboardClient useNativeTable={useNativeTable} />
}
