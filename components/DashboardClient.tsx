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

const WorkoutPhaseGrid = dynamic(
  () => import('@/components/WorkoutPhaseGrid'),
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
    md: '1fr 1fr',
  },
  gap: 2,
  // On large screens the top row (timer/HR) takes ~2/5 of the free
  // vertical space and the workout section takes the rest, so the
  // dashboard fills the viewport instead of top-anchoring with a blank
  // band below. Mobile stays content-sized (page scrolls).
  flexGrow: { xs: 0, md: 2 },
  flexShrink: 0,
  flexBasis: { xs: 'auto', md: 0 },
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
          // Top padding only: a `py` shorthand would emit breakpoint
          // rules that override the base paddingBottom below (media
          // queries sort after base styles), silently dropping the
          // overlay budget to 16px. Keep the two paddings separate.
          paddingTop: { xs: 2, sm: 3, md: 2, lg: 3 },
          // Flex column capped at the viewport (md+): the top row is
          // rigid, the card section compresses, and the uniform fit
          // shrinks type until everything fits. Below md the page
          // scrolls normally. vh first for older browsers.
          minHeight: ['100vh', '100dvh'],
          height: { xs: 'auto', md: ['100vh', '100dvh'] },
          overflow: { xs: 'visible', md: 'clip' },
          // ~72px Spotify bar + 56px bottom nav + 8px breathing room.
          paddingBottom: 'calc(72px + 56px + 8px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={mainGridStyles}>
          <Box sx={{ height: '100%' }}>
            <TimerDisplay />
          </Box>
          <HrmConnectionPanel />
        </Box>
        <Box
          sx={{
            width: '100%',
            mt: 2,
            // Workout section takes ~3/5 of free vertical space on large
            // screens (cards stretch via height:100% chains); content-sized
            // with page scroll below md.
            flexGrow: { xs: 0, md: 3 },
            flexShrink: 1,
            flexBasis: { xs: 'auto', md: 0 },
            minHeight: { md: 0 },
            overflowY: { xs: 'visible', md: 'auto' },
          }}
        >
          {!hasValidConfig ? (
            <Alert severity="warning" sx={{ width: '100%' }}>
              {missingConfigMsg}
            </Alert>
          ) : useNativeTable ? (
            <WorkoutPhaseGrid
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
