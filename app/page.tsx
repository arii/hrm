// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import PageContainer from '../components/PageContainer'
import { SxProps } from '@mui/material'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import DashboardSectionLoadingSkeleton from '../components/DashboardSectionLoadingSkeleton'
import { useEffect, useState } from 'react'
import HrmConnectionPanel from '../components/HrmConnectionPanel'
import TimerDisplay from '../components/TimerDisplay'
import { useAudio } from '../hooks/useAudio'

// Dynamically import SpotifyDisplay with SSR disabled.
// This prevents the heavy Spotify SDK logic from blocking the initial server HTML or hydration.
const SpotifyDisplay = dynamic(() => import('../components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <DashboardSectionLoadingSkeleton height={80} />, // Optional: Render nothing while loading to avoid layout shift
})

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

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

const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

const mainGridStyles: SxProps = {
  display: 'grid',
  gridTemplateColumns: {
    xs: '1fr',
    lg: '1fr 1fr',
  },
  gap: 2,
}

const Dashboard = () => {
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  const { initializeAudio } = useAudio()

  const handleInteraction = () => {
    if (!audioInitialized) {
      initializeAudio()
      setAudioInitialized(true)
    }
  }

  // Signal when page is ready for testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__TEST_READY__ = true
      window.dispatchEvent(new CustomEvent('test-ready'))
    }
  }, [])

  return (
    <PageContainer onClick={handleInteraction}>
      <Box sx={mainGridStyles}>
        {/*
         * The extra Box with height: '100%' is necessary to ensure the TimerDisplay
         * component stretches to fill the full height of the grid cell. The grid
         * itself defines the cell's height, but the child needs to explicitly
         * be told to occupy that full height.
         */}
        <Box sx={{ height: '100%' }}>
          <TimerDisplay />
        </Box>
        {/*
         * HrmConnectionPanel does not need a height wrapper because
         * it's internally structured to fill the height of its container.
         */}
        <HrmConnectionPanel />
      </Box>
      <Box sx={{ width: '100%', mt: 2 }}>
        {process.env.NEXT_PUBLIC_USE_NATIVE_TABLE ? (
          <WorkoutTableViewer docId={DOC_ID} />
        ) : (
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={DOC_URL}
            height={500}
            isShrunk={docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
          />
        )}
      </Box>

      <SpotifyDisplay />
    </PageContainer>
  )
}

export default Dashboard
