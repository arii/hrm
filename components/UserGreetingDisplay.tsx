'use client'

import { useSession } from 'next-auth/react'
import { UserProfile } from '@/types'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

const UserGreetingDisplay = () => {
  const { data: session, status } = useSession()
  const user: UserProfile | undefined = session?.user

  if (status === 'loading') {
    return null
  }

  return (
    <Box sx={{ mb: 2, textAlign: 'center' }}>
      <Typography variant="h5">
        {user ? `Welcome, ${user.name}!` : 'Please log in to continue'}
      </Typography>
    </Box>
  )
}

export default UserGreetingDisplay
