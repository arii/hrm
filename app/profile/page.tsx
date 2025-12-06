// app/profile/page.tsx
'use client'
import UserProfile from '@/components/UserProfile'
import Container from '@mui/material/Container'

const ProfilePage = () => {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <UserProfile />
    </Container>
  )
}

export default ProfilePage
