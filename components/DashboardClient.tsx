'use client'

import Container from '@mui/material/Container'
import { SxProps } from '@mui/material'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
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

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

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

interface DashboardClientProps {
  useNativeTable: boolean
  triggerError?: boolean
}

const DashboardClient = ({
  useNativeTable,
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
          {useNativeTable ? (
            <WorkoutTableHeader
              docId={DOC_ID}
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          ) : (
            <GoogleDocViewer
              title="Today's Training Regimen"
              embedUrl={DOC_URL}
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
