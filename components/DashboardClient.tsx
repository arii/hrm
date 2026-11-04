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
  // Fixed 45% of the column at every breakpoint: the timer/HR row never
  // grows into the cards and never collapses. Cells compress inside
  // (minHeight 0 + clip); the card text-fit absorbs the remainder.
  flexGrow: 0,
  flexShrink: 0,
  flexBasis: '45%',
  minHeight: 0,
  overflow: 'clip',
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
          // Fixed-viewport column at every breakpoint: timer row 45%,
          // cards the remainder, footer budget below. Zero-scroll
          // contract: nothing here may scroll on either axis; the card
          // text-fit (floor 12px, em-scaled chrome) absorbs overflow.
          // vh first for older browsers.
          minHeight: ['100vh', '100dvh'],
          height: ['100vh', '100dvh'],
          overflow: 'clip',
          // Slimmed Spotify bar (measured 64px) + 56px bottom nav + 8px
          // breathing room.
          paddingBottom: 'calc(64px + 56px + 8px)',
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
            // Workout section fills the remainder (~50%) after the fixed
            // 45% top row; cards stretch via height:100% chains and clip
            // (never scroll) past the text-fit floor.
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 0,
            minHeight: 0,
            overflow: 'clip',
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
