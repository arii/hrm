'use client'

import { useSession } from 'next-auth/react'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import SpotifyLoginButton from './SpotifyLoginButton'

/**
 * Renders a login prompt or loading state based on authentication status.
 * This component is intended to act as a gate, showing a login
 * button for unauthenticated users and rendering nothing for authenticated
 * users, allowing the parent component to render its own UI.
 */
const UserGreetingDisplay = () => {
  const { status } = useSession()

  if (status === 'loading') {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          width: '100%',
        }}
      >
        <Skeleton variant="rectangular" height={40} width={180} />
      </Box>
    )
  }

  if (status === 'unauthenticated') {
    return (
      <Box
        sx={{
          backgroundColor: 'grey.900',
          color: 'common.white',
          px: 3,
          py: 1.5,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: 1100,
          boxShadow: 3,
          width: '100%',
        }}
      >
        <SpotifyLoginButton />
      </Box>
    )
  }

  // If authenticated, render nothing and let the parent component handle the UI.
  return null
}

export default UserGreetingDisplay
