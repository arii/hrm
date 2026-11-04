// Shared client-only chart wrappers for the experimental analytics views.
// ExperimentalAnalyticsPage and SessionDetail previously defined these
// identically; a single module keeps the loading UI consistent.
'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@mui/material'

const chartLoading = () => <Skeleton variant="rectangular" height={300} />

export const HeartRateTimeSeries = dynamic(
  () => import('./HeartRateTimeSeries'),
  {
    ssr: false,
    loading: chartLoading,
  }
)

export const ZoneDistribution = dynamic(() => import('./ZoneDistribution'), {
  ssr: false,
  loading: chartLoading,
})
