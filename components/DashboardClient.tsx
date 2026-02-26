'use client'

import Container from '@mui/material/Container'
import { SxProps } from '@mui/material'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import DashboardSectionLoadingSkeleton from '@/components/DashboardSectionLoadingSkeleton'
import { useState } from 'react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import TimerDisplay from '@/components/TimerDisplay'
import { useAudio } from '@/hooks/useAudio'

// Dynamically import SpotifyDisplay with SSR disabled.
const SpotifyDisplay = dynamic(() => import('@/components/SpotifyDisplay'), {
  ssr: false,
  loading: () => (
    <Box
      sx={{
        position: 'fixed',
        bottom: 56,
        left: 0,
        right: 0,
        zIndex: 1100,
        width: '100%',
        minHeight: '64px',
      }}
    >
      <DashboardSectionLoadingSkeleton height="64px" />
    </Box>
  ),
})

const TestErrorTrigger = dynamic(() => import('./TestErrorTrigger'), {
  ssr: false,
})

const WorkoutTableHeader = dynamic(
  () => import('@/components/WorkoutTableHeader'),
  {
    ssr: false,
    loading: () => <DashboardSectionLoadingSkeleton height="500px" />,
  }
)

const GoogleDocViewer = dynamic(() => import('@/components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height="500px" />,
})

const mainGridStyles: SxProps = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    lg: '1fr 1fr',
  },
  gap: 2,
}

interface DashboardClientProps {
  useNativeTable: boolean
  docId?: string
  iframeUrl?: string
  triggerError?: boolean
}

const DashboardClient = ({
  useNativeTable,
  docId,
  iframeUrl,
  triggerError,
}: DashboardClientProps) => {
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const { initializeAudio } = useAudio()

  const handleRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1)
  }

  const handleInteraction = () => {
    if (!audioInitialized) {
      initializeAudio()
      setAudioInitialized(true)
    }
  }

  const hasValidConfig = useNativeTable ? !!docId : !!iframeUrl
  const missingConfigMsg = useNativeTable
    ? 'Google Doc ID not found. Please check GOOGLE_DOC_WORKOUT_URL.'
    : 'Google Doc Iframe URL not configured. Please check GOOGLE_DOC_IFRAME_URL.'

  return (
    <Box sx={{ backgroundColor: 'background.default' }}>
      {triggerError && <TestErrorTrigger />}
      <Container
        data-testid="dashboard"
        maxWidth="xl"
        onClick={handleInteraction}
        sx={{
          py: { xs: 2, sm: 3 },
          minHeight: '100vh',
        }}
      >
        <Box sx={mainGridStyles}>
          <Box sx={{ height: '100%' }}>
            <TimerDisplay />
          </Box>
          <HrmConnectionPanel />
        </Box>
        <Box sx={{ width: '100%', mt: 2 }}>
          {!hasValidConfig ? (
            <Alert severity="warning" sx={{ width: '100%' }}>
              {missingConfigMsg}
            </Alert>
          ) : useNativeTable ? (
            <WorkoutTableHeader
              docId={docId || ''}
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          ) : (
            <GoogleDocViewer
              title="Today's Training Regimen"
              embedUrl={iframeUrl || ''}
              height={500}
              isShrunk={docIsManuallyShrunk}
              onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          )}
        </Box>
      </Container>

      <SpotifyDisplay />
    </Box>
  )
}

export default DashboardClient
