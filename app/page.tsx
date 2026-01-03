// File: app/page.tsx (Main Viewer Dashboard)
/**
 * Main Viewer Dashboard: The primary output page for the trainer or viewer.
 * Consumes all real-time data streams and renders the unified MUI visualization.
 */
'use client'
import Container from '@mui/material/Container'
import Paper from '@mui/material/Paper'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useEffect, useState } from 'react'
import HrmConnectionPanel from '../components/HrmConnectionPanel'
import TimerDisplay from '../components/TimerDisplay'
import { useAudio } from '../hooks/useAudio'
import { motion } from 'framer-motion'

// Animation variants for sections
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const CenteredLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100%">
    <CircularProgress />
  </Box>
)

// Dynamically import components with SSR disabled and custom loader
const SpotifyDisplay = dynamic(() => import('../components/SpotifyDisplay'), {
  ssr: false,
  loading: () => <CenteredLoader />,
})

const DOC_URL =
  'https://docs.google.com/document/d/e/2PACX-1vTev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ/pub?embedded=true'

const WorkoutTableViewer = dynamic(
  () => import('../components/WorkoutTableViewer'),
  {
    ssr: false,
    loading: () => <CenteredLoader />,
  }
)

const GoogleDocViewer = dynamic(() => import('../components/GoogleDocViewer'), {
  ssr: false,
  loading: () => <CenteredLoader />,
})

const DOC_ID =
  '1Tev5AMiHYi2Jkg9x6zRQoiJ_o2X_wZMqAXVpwgjlSqzlcXelxSc7psjE8n3N-ghzXMFtnv51nc2fJZ'

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
    <Container
      maxWidth="xl"
      onClick={handleInteraction}
      sx={{
        py: { xs: 3, sm: 4 },
        minHeight: '100vh',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: 3,
        }}
      >
        <Box sx={{ flex: '1 1 60%' }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <Paper sx={{ height: '100%', p: { xs: 2, sm: 3 } }}>
              <TimerDisplay />
            </Paper>
          </motion.div>
        </Box>
        <Box sx={{ flex: '1 1 40%' }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={sectionVariants}
          >
            <Paper sx={{ height: '100%', p: { xs: 2, sm: 3 } }}>
              <HrmConnectionPanel />
            </Paper>
          </motion.div>
        </Box>
      </Box>

      <Box sx={{ mt: 3 }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <Paper sx={{ p: { xs: 2, sm: 3 } }}>
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
          </Paper>
        </motion.div>
      </Box>

      <Box sx={{ mt: 3 }}>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={sectionVariants}
        >
          <SpotifyDisplay />
        </motion.div>
      </Box>
    </Container>
  )
}

export default Dashboard
