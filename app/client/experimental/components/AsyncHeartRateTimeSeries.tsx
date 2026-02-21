// app/client/experimental/components/AsyncHeartRateTimeSeries.tsx
'use client'
import dynamic from 'next/dynamic'
import { Skeleton } from '@mui/material'

const AsyncHeartRateTimeSeries = dynamic(() => import('./HeartRateTimeSeries'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={300} />,
})

export default AsyncHeartRateTimeSeries
