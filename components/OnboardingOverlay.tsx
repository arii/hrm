'use client'

import { Alert, AlertTitle } from '@mui/material'
import { checkOnboardingRequirements } from '@/utils/browserSupport'
import { useState, useEffect } from 'react'

export const OnboardingOverlay = () => {
  // Initialize with allSupported: true to prevent hydration mismatch (matches server)
  const [support, setSupport] = useState({
    allSupported: true,
    bluetooth: true,
    isSecure: true,
    webSockets: true,
  })
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Wrap in timeout to avoid "setState in effect" warning and ensure client-side execution
    const timer = setTimeout(() => {
      setSupport(checkOnboardingRequirements())
    }, 0)
    return () => clearTimeout(timer)
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
