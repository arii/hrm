'use client'

import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import UserSettings from '@/app/client/connect/UserSettings'
import { useConnectUserProfile } from '@/hooks/useConnectUserProfile'

/**
 * Profile settings surface (spec art_uI0w7D6m D5 / OQ-2a).
 *
 * Reuses the connect flow's UserSettings form so profile fields are edited
 * through one code path; the only difference is reachability: this page is
 * linked from the bottom nav, so fixing a name typo no longer requires
 * visiting the Bluetooth connect flow.
 */
export default function SettingsPage() {
  const userProfile = useConnectUserProfile()

  return (
    <Container maxWidth="sm" sx={{ py: 3, pb: 10 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Profile Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your profile is used for calorie estimation and heart-rate zone
        calculations.
      </Typography>
      <UserSettings profile={userProfile} />
    </Container>
  )
}
