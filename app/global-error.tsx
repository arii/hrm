'use client'

import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            p: 2,
            backgroundColor: 'background.default',
            color: 'text.primary',
          }}
        >
          <Typography variant="h4" gutterBottom>
            Application Error
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Something went wrong. Please try again.
          </Typography>
          <Button
            variant="contained"
            onClick={() => reset()}
            sx={{
              backgroundColor: 'primary.contrastText',
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'grey.200',
              },
            }}
          >
            Try Again
          </Button>
        </Box>
      </body>
    </html>
  )
}
