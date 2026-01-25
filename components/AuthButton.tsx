// components/AuthButton.tsx
'use client'

import Button from '@mui/material/Button'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

interface AuthButtonProps {
  providerId: string
  providerName: string
}

const AuthButton = ({ providerId, providerName }: AuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      console.log(
        `[AuthButton] Clicking login for ${providerName}, calling signIn()...`
      )
      const result = await signIn(providerId, {
        callbackUrl: '/',
        redirect: true,
      })
      console.log(`[AuthButton] signIn() result for ${providerName}:`, result)
    } catch (error) {
      console.error(`[AuthButton] signIn() error for ${providerName}:`, error)
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
      {isLoading ? 'Logging in...' : `Login with ${providerName}`}
    </Button>
  )
}

export default AuthButton
