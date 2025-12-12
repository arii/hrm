'use client'

import React from 'react'
import { useLoading } from '@/context/LoadingContext'
import { Backdrop, CircularProgress } from '@mui/material'

const GlobalLoadingIndicator: React.FC = () => {
  const { isLoading } = useLoading()

  return (
    <Backdrop
      open={isLoading}
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
    >
      <CircularProgress color="inherit" />
    </Backdrop>
  )
}

export default GlobalLoadingIndicator
