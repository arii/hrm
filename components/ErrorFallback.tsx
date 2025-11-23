'use client'

import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

const ErrorFallback = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        p: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Something went wrong.
      </Typography>
      <Button variant="contained" onClick={() => window.location.reload()}>
        Reload Page
      </Button>
    </Box>
  )
}

export default ErrorFallback
