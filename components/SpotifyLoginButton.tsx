// components/SpotifyLoginButton.tsx
'use client'

import Button from '@mui/material/Button'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useError } from '@/context/ErrorContext'

const SpotifyLoginButton = () => {
  const { addError } = useError()
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
      if (result?.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('[SpotifyLoginButton] signIn() error:', error)
      addError('Authentication failed. Please try again.')
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
