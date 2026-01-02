// app/client/connect-experimental/page.tsx
'use client'

import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { Container, Typography } from '@mui/material'

const ConnectExperimentalPage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Experimental Connection Page
      </Typography>
      <HrmConnectionPanel />
    </Container>
  )
}

export default ConnectExperimentalPage
