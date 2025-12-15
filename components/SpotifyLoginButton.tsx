// components/SpotifyLoginButton.tsx
'use client'

import Button from '@mui/material/Button'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import logger from '@/utils/logger'

const SpotifyLoginButton = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      logger.info('Attempting Spotify login')
      const result = await signIn('spotify', {
        callbackUrl: '/',
        redirect: true,
      })
      // This part is unlikely to be reached due to the redirect
      logger.info('Spotify signIn() call completed', { result })
    } catch (error) {
      logger.error('Spotify signIn() failed', { error })
      setIsLoading(false) // Only reached on error
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
