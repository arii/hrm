'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'

/**
 * Renders a button that handles Spotify authentication.
 * Displays "Login with Spotify" or "Logout" based on session status.
 */
export default function AuthButton() {
  const { data: session, status } = useSession()
  const loading = status === 'loading'

  if (loading) {
    return <CircularProgress size={24} />
  }

  if (session) {
    return (
      <Button variant="contained" color="secondary" onClick={() => signOut()}>
        Logout
      </Button>
    )
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={() => signIn('spotify')}
    >
      Login with Spotify
    </Button>
  )
}
