'use client'

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
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Reload Page
        </Button>
        <Button variant="outlined" onClick={() => (window.location.href = '/')}>
          Go Home
        </Button>
      </Box>
    </Box>
  )
}

export default ErrorFallback
