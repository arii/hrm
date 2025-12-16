'use client'

import Container from '@mui/material/Container'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
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
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
    }
  }, [])

  return (
    <Container
      maxWidth="xl"
      onClick={handleInteraction}
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
