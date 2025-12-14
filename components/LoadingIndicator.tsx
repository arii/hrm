'use client'

import React from 'react'
import { Box, LinearProgress, useTheme } from '@mui/material'
import { useLoading } from '@/context/LoadingContext'

export const LoadingIndicator: React.FC = () => {
  const theme = useTheme()
  const { isLoading } = useLoading()

  if (!isLoading) return null

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: theme.spacing(0.5),
        bgcolor: 'primary.main',
        zIndex: 9999,
      }}
      role="progressbar"
      aria-label="Loading"
    >
      <LinearProgress />
    </Box>
  )
}
