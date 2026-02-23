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
  loading: () => <DashboardSectionLoadingSkeleton height="80px" />,
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
  workoutDocUrl?: string
  workoutDocIframeUrl?: string
}

const DashboardClient = ({
  useNativeTable,
  workoutDocUrl,
  workoutDocIframeUrl,
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

  const docId = workoutDocUrl
    ? workoutDocUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]
    : undefined

  return (
    <Container
      data-testid="dashboard"
      maxWidth="xl"
      onClick={handleInteraction}
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
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
            docId={docId || ''}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        ) : (
          <GoogleDocViewer
            title="Today's Training Regimen"
            embedUrl={workoutDocIframeUrl || ''}
            height={500}
            isShrunk={docIsManuallyShrunk}
            onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
            refreshKey={refreshKey}
            onRefresh={handleRefresh}
          />
        )}
      </Box>

      <SpotifyDisplay />
    </Container>
  )
}

export default DashboardClient
