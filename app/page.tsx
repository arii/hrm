// File: app/page.tsx (Server Component Entry Point)
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import DashboardClient from './DashboardClient'
import { HrmStaticMetadata } from '@/types/shared'

/**
 * Server Component responsible for fetching initial data and passing it
 * to the client-side Dashboard component.
 */
<<<<<<< HEAD
'use client'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Skeleton from '@mui/material/Skeleton'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorFallback from '../components/ErrorFallback'
import HrmTiles from '../components/HrmTiles'
import TimerDisplay from '../components/TimerDisplay'
import { useAudio } from '../hooks/useAudio'
import useVolumePreference from '@/hooks/useVolumePreference'
import { useWebSocket } from '@/context/WebSocketContext'

// Dynamically import SpotifyDisplay with SSR disabled.
// This prevents the heavy Spotify SDK logic from blocking the initial server HTML or hydration.
const SpotifyDisplay = dynamic(() => import('../components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={80} />, // Optional: Render nothing while loading to avoid layout shift
})

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const WorkoutTableViewer = dynamic(
  () => import('../components/WorkoutTableViewer'),
  {
    ssr: false,
    loading: () => <Skeleton variant="rectangular" height={500} />,
  }
)

const GoogleDocViewer = dynamic(() => import('../components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <Skeleton variant="rectangular" height={500} />,
})

const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

const Dashboard = () => {
  const { timerData } = useWebSocket()
  const [docIsManuallyShrunk, setDocIsManuallyShrunk] = useState(false)
  const [audioInitialized, setAudioInitialized] = useState(false)
  useVolumePreference()
  const { initializeAudio } = useAudio(timerData)

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
    <Container
      maxWidth="xl"
      onClick={handleInteraction}
      sx={{
        py: { xs: 2, sm: 3 },
        minHeight: '100vh',
        backgroundColor: 'background.default',
      }}
    >
      <Grid container spacing={{ xs: 2, sm: 2, md: 3 }}>
        {/* --------------------- TOP ROW: TIMER + HR TILES --------------------- */}

        {/* 1. TABATA TIMER - Componentized */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <TimerDisplay
            phase={timerData.currentPhase}
            timeRemaining={timerData.timeRemaining}
            timeElapsed={timerData.timeElapsed}
            mode={timerData.mode}
            workDuration={timerData.workDuration}
            restDuration={timerData.restDuration}
            soundEventId={timerData.soundEventId}
          />
        </Grid>

        <ErrorBoundary fallback={<ErrorFallback />}>
          <HrmTiles />
        </ErrorBoundary>

        <Grid size={{ xs: 12 }}>
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
        </Grid>
      </Grid>

      <ErrorBoundary fallback={<ErrorFallback />}>
        <SpotifyDisplay />
      </ErrorBoundary>
    </Container>
  )
=======
const DashboardPage = async () => {
  const session = await getServerSession(authOptions)

  // In a real application, you would fetch this data from a database
  // using the user's session information. For this example, we'll
  // create some mock static data.
  const initialHrmData: HrmStaticMetadata[] = []
  if (session?.user) {
    initialHrmData.push({
      clientId: session.user.id, // Use a stable ID from the session
      name: session.user.name || 'User',
      age: 30, // Placeholder age
      maxHr: 190, // Placeholder max HR
    })
  }

  return <DashboardClient initialHrmData={initialHrmData} />
>>>>>>> b1d8a0e (Apply patch /tmp/cf6bb4ec-efd4-421e-a9f0-364180285c67.patch)
}

export default DashboardPage
