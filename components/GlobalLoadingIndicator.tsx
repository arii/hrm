'use client'

import React from 'react'
import { useLoading } from '@/context/LoadingContext'
import { Backdrop, CircularProgress, Typography } from '@mui/material'

const GlobalLoadingIndicator: React.FC = () => {
  const { isLoading } = useLoading()

  return (
    <Backdrop
      open={isLoading}
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      aria-labelledby="loading-indicator-title"
      aria-describedby="loading-indicator-description"
    >
      <Typography id="loading-indicator-title" component="h2" sx={{ display: 'none' }}>
        Loading
      </Typography>
      <Typography id="loading-indicator-description" sx={{ display: 'none' }}>
        Please wait while the content is loading.
      </Typography>
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

export default GlobalLoadingIndicator
