// components/AuthButton.tsx
'use client'

import Button from '@mui/material/Button'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useError } from '@/context/ErrorContext'

interface AuthButtonProps {
  providerId: string
  providerName: string
}

const AuthButton = ({ providerId, providerName }: AuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { addError } = useError()

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      console.log(
        `[AuthButton] Clicking login for ${providerName}, calling signIn()...`
      )
      const result = await signIn(providerId, {
        redirect: false,
      })

      if (result?.ok) {
        const syncResponse = await fetch('/api/auth/sync', {
          method: 'POST',
        })

        if (syncResponse.ok) {
          window.location.href = '/'
        } else {
          throw new Error('Failed to sync with server. Please try again.')
        }
      } else {
        throw new Error('Sign in failed. Please try again.')
      }

      console.log(`[AuthButton] signIn() result for ${providerName}:`, result)
    } catch (error) {
      addError(error instanceof Error ? error.message : String(error))
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
