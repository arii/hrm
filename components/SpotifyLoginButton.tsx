// components/SpotifyLoginButton.tsx
'use client'

import Button from '@mui/material/Button'
import { signIn } from 'next-auth/react'

const SpotifyLoginButton = () => {
  const handleLogin = async () => {
    // Use NextAuth's built-in sign-in flow with Spotify provider
    // This automatically handles the correct redirect URI and CSRF protection
    await signIn('spotify', { callbackUrl: '/' })
  }

  return (
    <Button variant="contained" color="primary" onClick={handleLogin}>
      Login with Spotify
    </Button>
  )
}

export default SpotifyLoginButton
