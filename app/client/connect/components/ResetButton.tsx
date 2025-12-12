// app/client/connect/components/ResetButton.tsx
'use client'

import { Button } from '@mui/material'

/**
 * A client-side component that renders a button to reset client and server state.
 *
 * - Clears all relevant cookies and localStorage.
 * - Sends a request to the `/api/reset` endpoint to clear server-side state.
 * - Prompts the user for confirmation before proceeding.
 * - Reloads the page upon successful completion.
 */
const ResetButton = () => {
  const handleReset = async () => {
    if (
      !window.confirm(
        'Are you sure you want to clear all stored data? This will remove your saved name, age, and Bluetooth device pairing. This action is recommended if you are experiencing persistent connection issues.'
      )
    ) {
      return
    }

    try {
      // Clear client-side cookies
      document.cookie =
        'hrm_user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie =
        'hrm_user_age=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
      document.cookie =
        'hrm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

      // Clear local storage
      localStorage.clear()

      // Call the server-side reset API
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'An unknown error occurred.')
      }

      alert('Storage cleared successfully. The page will now reload.')
      window.location.reload()
    } catch (error) {
      console.error('Error resetting application:', error)
      alert(`Failed to reset application: ${error instanceof Error ? error.message : String(error)}`)
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
      Clear Stored Data & Reset
    </Button>
  )
}

export default ResetButton
