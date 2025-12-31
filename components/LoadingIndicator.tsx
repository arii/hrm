'use client'

import { useLoading } from '@/context/LoadingContext'
import { Backdrop, CircularProgress, useTheme } from '@mui/material'

const LoadingIndicator = () => {
  const { isLoading } = useLoading()
  const theme = useTheme()

  return (
    <Backdrop
      open={isLoading}
      sx={{
        zIndex: theme.zIndex.modal + 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <CircularProgress color="primary" />
    </Backdrop>
  )
}

export default LoadingIndicator
