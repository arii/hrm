// components/SpotifyLoginButton.tsx
'use client'

import Button from '@mui/material/Button'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

const SpotifyLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      console.log('[SpotifyLoginButton] Clicking login, calling signIn()...')
      const result = await signIn('spotify', {
        callbackUrl: '/',
        redirect: true,
      })
      console.log('[SpotifyLoginButton] signIn() result:', result)
    } catch (error) {
      console.error('[SpotifyLoginButton] signIn() error:', error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleLogin}
      disabled={isLoading}
    >
      {isLoading ? 'Logging in...' : 'Login with Spotify'}
    </Button>
  )
}

export default SpotifyLoginButton
