// components/OnboardingOverlay.tsx
'use client'

import { Alert, AlertTitle } from '@mui/material'
import { checkOnboardingRequirements } from '@/utils/browserSupport'
import { useState } from 'react'

export const OnboardingOverlay = () => {
  const [support] = useState(() => checkOnboardingRequirements())

  if (support.allSupported) {
    return null
  }

  return (
    <Alert severity="warning" variant="filled" sx={{ m: 2 }}>
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
