// app/client/experimental/page.tsx
'use client'
import { Container } from '@mui/material'
import HeartRateTimeSeries from '@/components/analytics/HeartRateTimeSeries'

const ExperimentalAnalyticsPage = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <HeartRateTimeSeries data={[]} />
    </Container>
  )
}

export default ExperimentalAnalyticsPage
