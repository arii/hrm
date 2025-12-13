'use client'
import { useSession } from 'next-auth/react'
import Typography from '@mui/material/Typography'
import SpotifyLoginButton from './SpotifyLoginButton'
import { Skeleton } from '@mui/material'

const UserGreetingDisplay = () => {
  const { status, data: session } = useSession()
  const isLoggedIn = status === 'authenticated'

  if (status === 'loading') {
    return <Skeleton variant="text" width={120} />
  }

  if (!isLoggedIn) {
    return <SpotifyLoginButton />
  }

  return (
    <Typography variant="body2" sx={{ fontWeight: 600, color: 'common.white' }}>
      Welcome, {session?.user?.name ?? 'User'}
    </Typography>
  )
}

export default UserGreetingDisplay
