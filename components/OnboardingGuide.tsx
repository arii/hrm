// components/OnboardingGuide.tsx
'use client'

import Box from '@mui/material/Box'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import StepContent from '@mui/material/StepContent'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

const steps = [
  {
    label: 'Connect a Device',
    description: `To get started, connect your heart rate monitor. You can do this by navigating to the connection page.`,
    buttonText: 'Go to Connect Page',
    href: '/client/connect',
  },
  {
    label: 'Start Streaming',
    description:
      'Once your device is connected, it will start streaming your heart rate data in real-time.',
  },
  {
    label: 'View Live Data',
    description: `Your live heart rate, calories burned, and other metrics will appear here on the dashboard.`,
  },
]

export default function OnboardingGuide() {
  return (
    <Box sx={{ width: '100%' }} data-testid="onboarding-guide">
      <Stepper orientation="vertical">
        {steps.map((step) => (
          <Step key={step.label} expanded={true}>
            <StepLabel>{step.label}</StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              {step.href && (
                <Box sx={{ mb: 2, mt: 1 }}>
                  <div>
                    <Link href={step.href} passHref>
                      <Button variant="contained" sx={{ mt: 1, mr: 1 }}>
                        {step.buttonText}
                      </Button>
                    </Link>
                  </div>
                </Box>
              )}
            </StepContent>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}
