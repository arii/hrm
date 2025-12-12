import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

/**
 * Renders a 404 Not Found page as a Next.js Server Component.
 * This component is displayed when a user tries to access a page that does not exist.
 * It provides a clear message and a link to navigate back to the homepage.
 *
 * @returns {JSX.Element} The rendered 404 page component.
 */
export default function NotFoundPage() {
  return (
    <Container sx={{ flexGrow: 1, display: 'flex' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          width: '100%', // Ensure the box takes the full width of the container
        }}
      >
        <Typography variant="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" gutterBottom>
          Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Sorry, the page you are looking for does not exist.
        </Typography>
        <Button variant="contained" color="primary" component={Link} href="/">
          Go to Homepage
        </Button>
      </Box>
    </Container>
  )
}
