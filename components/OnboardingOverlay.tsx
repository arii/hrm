'use client'

import { Alert, AlertTitle } from '@mui/material'
import { checkOnboardingRequirements } from '@/utils/browserSupport'
import { useState, useEffect } from 'react'

const DEFAULT_SUPPORT = {
  allSupported: true,
  bluetooth: true,
  isSecure: true,
  webSockets: true,
}

export const OnboardingOverlay = () => {
  // Initialize with allSupported: true to prevent hydration mismatch (matches server)
  const [support, setSupport] = useState(DEFAULT_SUPPORT)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check requirements only on client-side after mount to avoid hydration mismatch.
    // This triggers a re-render if requirements are not met, which is expected.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupport(checkOnboardingRequirements())
  }, [])

  if (support.allSupported || dismissed) {
    return null
  }

  return (
    <Alert
      severity="warning"
      variant="filled"
      sx={{ m: 2 }}
      onClose={() => setDismissed(true)}
    >
      <AlertTitle>Browser Incompatible</AlertTitle>
      {!support.bluetooth && (
        <p>
          To use the Heart Rate Monitor, please use a browser that supports Web
          Bluetooth, such as Chrome, Edge, or Bluefy on iOS.
        </p>
      )}
      {!support.isSecure && (
        <p>A secure connection (HTTPS) is required for Bluetooth features.</p>
      )}
      {!support.webSockets && (
        <p>
          Your browser does not support WebSockets, which are required for
          real-time communication.
        </p>
      )}
    </Alert>
  )
}

export default OnboardingOverlay
