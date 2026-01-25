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
      // Step 1: Sign in without an immediate redirect.
      // This allows us to get the session details on the client-side.
      const result = await signIn(providerId, {
        redirect: false,
        callbackUrl: '/', // Still specify where to go after
      })

      console.log(`[AuthButton] signIn() result for ${providerName}:`, result)

      // Step 2: If sign-in was successful, sync the token with the backend.
      if (result && result.ok && !result.error) {
        console.log('[AuthButton] Sign-in successful, now syncing token...')

        // This POST request tells our backend to grab the token from the
        // session cookie and pass it to the internal services.
        const syncResponse = await fetch('/api/auth/sync', {
          method: 'POST',
        })

        if (syncResponse.ok) {
          console.log('[AuthButton] Token sync successful. Redirecting...')
          // Step 3: Manually redirect the user to the intended page.
          window.location.href = result.url || '/'
        } else {
          // Handle the case where the backend sync fails.
          const errorData = await syncResponse.json()
          console.error(
            `[AuthButton] Token sync failed: ${
              errorData.error || 'Unknown error'
            }`
          )
          // Optionally, show an error to the user here.
          setIsLoading(false)
        }
      } else {
        // Handle sign-in failures (e.g., user cancels the OAuth flow).
        console.error('[AuthButton] signIn() failed:', result?.error)
        setIsLoading(false)
      }
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
