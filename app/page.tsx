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

  return <DashboardClient useNativeTable={useNativeTable} />
}
