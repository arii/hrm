'use client'

import { useLoading } from '@/context/LoadingContext'
import { Box, CircularProgress, useTheme } from '@mui/material'

const LoadingIndicator = () => {
  const { isLoading } = useLoading()
  const theme = useTheme()

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.palette.background.overlay,
        zIndex: theme.zIndex.loadingIndicator,
        transition: theme.transitions.create('opacity', {
          duration: theme.transitions.duration.short,
        }),
        opacity: isLoading ? 1 : 0,
        visibility: isLoading ? 'visible' : 'hidden',
      }}
    >
      <CircularProgress />
    </Box>
  )
}

export default LoadingIndicator
