'use client'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

/**
 * Renders a 404 Not Found page.
 * This component is displayed when a user tries to access a page that does not exist.
 * It provides a clear message and a link to navigate back to the homepage.
 *
 * @returns {JSX.Element} The rendered 404 page component.
 */
export default function NotFoundPage(): JSX.Element {
  return (
    <Container>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '80vh',
          textAlign: 'center',
        }}
      >
        <Typography variant="h1" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h5" component="h2" gutterBottom>
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
