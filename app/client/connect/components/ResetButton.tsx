// app/client/connect/components/ResetButton.tsx
'use client'

import { Button } from '@mui/material'

/**
 * A client-side component that renders a button to reset Bluetooth connection data.
 *
 * - Clears user name, age, and device ID cookies.
 * - Clears user settings (including the device ID) from localStorage.
 * - Prompts the user for confirmation before proceeding.
 * - Reloads the page upon successful completion.
 */
const ResetButton = () => {
  const handleReset = () => {
    if (
      !window.confirm(
        'Are you sure you want to clear connection data? This will remove your saved name, age, and Bluetooth device pairing. This action is recommended if you are experiencing persistent connection issues.'
      )
    ) {
      return
    }

    try {
      // Clear client-side cookies related to the connection
      document.cookie =
        'hrm_user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie =
        'hrm_user_age=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie =
        'hrm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

      // Clear the user settings from local storage, which contains the device ID
      localStorage.removeItem('user-settings')

      alert('Connection data cleared successfully. The page will now reload.')
      window.location.reload()
    } catch (error) {
      console.error('Error clearing connection data:', error)
      alert(
        `Failed to clear connection data: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  return (
    <Button
      variant="outlined"
      color="error"
      fullWidth
      onClick={handleReset}
      sx={{ mt: 2 }}
    >
      Clear Connection Data
    </Button>
  )
}

export default ResetButton
