'use client'

import Container from '@mui/material/Container'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import DashboardSectionLoadingSkeleton from '../components/DashboardSectionLoadingSkeleton'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorFallback from '../components/ErrorFallback'
import HrmConnectionPanel from '../components/HrmConnectionPanel'
import TimerDisplay from '../components/TimerDisplay'
import { useAudio } from '../hooks/useAudio'
import useVolumePreference from '@/hooks/useVolumePreference'

const SpotifyDisplay = dynamic(() => import('../components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height={80} />,
})

const WorkoutTableViewer = dynamic(
  () => import('../components/WorkoutTableViewer'),
  {
    ssr: false,
    loading: () => <DashboardSectionLoadingSkeleton height={500} />,
  }
)

const GoogleDocViewer = dynamic(() => import('../components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height={500} />,
})

interface DashboardClientProps {
  docUrl: string
  docId: string
  useNativeTable: boolean
}

/**
 * DashboardClient component
 *
 * This component is the client-side entry point for the main dashboard.
 * It's responsible for handling all client-side logic, including state management,
 * user interactions, and dynamic component loading.
 *
 * It's rendered by the `DashboardPage` server component, which passes in the
 * initial data as props.
 */
const DashboardClient = ({
  docUrl,
  docId,
  useNativeTable,
}: DashboardClientProps) => {
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  useVolumePreference()
  const { initializeAudio } = useAudio()

  const handleInteraction = () => {
    if (!audioInitialized) {
      initializeAudio()
      setAudioInitialized(true)
    }
  }

  useEffect(() => {
    // This effect signals to Playwright that the page is hydrated and ready for interaction.
    // It dispatches a custom event that our E2E tests can wait for, ensuring that tests
    // do not run against a partially rendered or non-interactive page.
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
    }
  }, [])

  if (!audioInitialized) {
    return (
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, sm: 3 },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h5" gutterBottom>
          Audio Disabled
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Click the button to enable audio for workout alerts.
        </Typography>
        <Button
          variant="contained"
          onClick={handleInteraction}
          aria-label="Initialize audio"
        >
          Enable Audio
        </Button>
      </Container>
    )
  }

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Box
          sx={{ flexGrow: 1, width: { xs: '100%', lg: 'calc(50% - 16px)' } }}
        >
          <TimerDisplay />
        </Box>

        <ErrorBoundary fallback={<ErrorFallback />}>
          <HrmConnectionPanel />
        </ErrorBoundary>

        <Box sx={{ width: '100%' }}>
          {useNativeTable ? (
            <WorkoutTableViewer docId={docId} />
          ) : (
            <GoogleDocViewer
              title="Today's Training Regimen"
              embedUrl={docUrl}
              height={500}
              isShrunk={docIsManuallyShrunk}
              onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
            />
          )}
        </Box>
      </Box>

      <ErrorBoundary fallback={<ErrorFallback />}>
        <SpotifyDisplay />
      </ErrorBoundary>
    </Container>
  )
}

export default DashboardClient
