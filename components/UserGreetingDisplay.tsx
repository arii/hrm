'use client'

import { UserProfile } from '@/types'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface UserGreetingDisplayProps {
  user: UserProfile | null
}

const UserGreetingDisplay: React.FC<UserGreetingDisplayProps> = ({ user }) => {
  return (
    <Box sx={{ mb: 2, textAlign: 'center' }}>
      <Typography variant="h5">
        {user?.name ? `Welcome, ${user.name}!` : 'Please log in to continue'}
      </Typography>
    </Box>
  )
}

export default UserGreetingDisplay
