// components/AuthButton.tsx
'use client'

import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import { signIn } from 'next-auth/react'
import logger from '@/utils/logger'
import { useState } from 'react'
import { getBasePath } from '@/utils/urls'

interface AuthButtonProps {
  providerId: string
  providerName: string
  menuItem?: boolean
}

const AuthButton = ({
  providerId,
  providerName,
  menuItem = false,
}: AuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      logger.debug(
        `[AuthButton] Clicking login for ${providerName}, calling signIn()...`
      )
      const basePath = getBasePath()
      const result = await signIn(providerId, {
        // Land back inside the served subpath (proxied) or site root (direct/prod).
        callbackUrl: basePath === '' ? '/' : basePath,
        redirect: true,
      })
      logger.debug(`[AuthButton] signIn() result for ${providerName}:`, result)
    } catch (error) {
      logger.error(`[AuthButton] signIn() error for ${providerName}:`, error)
      setIsLoading(false)
    }
  }

  if (menuItem) {
    return (
      <MenuItem onClick={handleLogin} disabled={isLoading}>
        {isLoading ? 'Logging in...' : `Login with ${providerName}`}
      </MenuItem>
    )
  }

  return (
    <Button
      variant="contained"
      color="primary"
      onClick={handleLogin}
      disabled={isLoading}
      aria-label={`Login with ${providerName}`}
    >
      {isLoading ? 'Logging in...' : `Login with ${providerName}`}
    </Button>
  )
}

export default AuthButton
