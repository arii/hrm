'use client'

import Container from '@mui/material/Container'
import { SxProps } from '@mui/material'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import DashboardSectionLoadingSkeleton from '@/components/DashboardSectionLoadingSkeleton'
import { useContext, useState } from 'react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import TimerDisplay from '@/components/TimerDisplay'
import { useIsScaledLayout } from '@/components/ScaledStage'
import { useAudio } from '@/hooks/useAudio'
import { HrmDataContext } from '@/context/WebSocketContext'
import {
  DASHBOARD_DESIGN_HEIGHT,
  DASHBOARD_TOP_ROW_HEIGHT_MD,
  FOOTER_HEIGHT_PX,
  FOOTER_RESERVE_RESPONSIVE,
  FOOTER_RESERVE_SCALED,
  getTopRowGridColumns,
} from '@/constants/layout'

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

// Target composition (1440px viewport) uses the two-column grid; in
// scaled mode that composition is fixed so the canvas never reflips
// with the real window size.
//
// The top row has a strict fixed height on desktop so connecting a 3rd
// or 4th HR client never stretches the timer vertically or pushes the
// exercise tiles below. HR count only changes the horizontal split:
// 3 tiles shrink the timer to ~38%, every other count uses 50/50.
const getMainGridStyles = (
  isScaledLayout: boolean,
  hrCount: number
): SxProps => {
  // Single source of truth for the Timer/HR split; scaled mode pins
  // the md composition so the canvas never reflips with window size.
  const topRowColumns = getTopRowGridColumns(hrCount)
  return {
    display: 'grid',
    gridTemplateColumns: isScaledLayout
      ? topRowColumns.md
      : {
          xs: '1fr',
          // Two-column top row from md up so the fixed height applies on
          // desktop; phones keep the stacked (auto-height) layout.
          md: topRowColumns.md,
        },
    gap: 1.5,
    // Fixed height on desktop prevents Timer from growing vertically and
    // prevents pushing Exercise tiles. xs stays auto (stacked layout).
    height: isScaledLayout
      ? DASHBOARD_TOP_ROW_HEIGHT_MD
      : { xs: 'auto', md: DASHBOARD_TOP_ROW_HEIGHT_MD },
    minHeight: isScaledLayout
      ? DASHBOARD_TOP_ROW_HEIGHT_MD
      : { md: DASHBOARD_TOP_ROW_HEIGHT_MD },
    maxHeight: isScaledLayout
      ? DASHBOARD_TOP_ROW_HEIGHT_MD
      : { md: DASHBOARD_TOP_ROW_HEIGHT_MD },
    // The timer row never squeezes: the workout section below absorbs all
    // flex (and scrolls internally when its content runs tall).
    flexShrink: 0,
    width: '100%',
    overflow: 'hidden',
  }
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
  const isScaledLayout = useIsScaledLayout()
  // Active HR client count drives the top-row horizontal split (timer
  // shrinks to ~38% for exactly 3 tiles). Reads the raw context so the
  // component still renders without a provider (unit tests, stories).
  const hrmData = useContext(HrmDataContext)
  const hrCount = Array.isArray(hrmData) ? hrmData.length : 0
  // Scaled mode fills the fixed canvas (viewport units would resolve
  // against the real window, breaking canvas proportions); otherwise
  // the shell fills the viewport as before.
  const shellHeight = isScaledLayout
    ? `${DASHBOARD_DESIGN_HEIGHT - FOOTER_HEIGHT_PX}px`
    : `calc(100vh - ${FOOTER_HEIGHT_PX}px)`

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
    <Box
      sx={{
        backgroundColor: 'background.default',
        // Fixed viewport app shell: the page itself never scrolls. The
        // timer row keeps its size, the workout section flexes into the
        // remaining space (scrolling internally when tall), and the
        // footer reserve below accounts for the fixed footer stack. The
        // in-flow page Footer below this shell is subtracted so the body
        // never scrolls.
        height: shellHeight,
        ...(isScaledLayout
          ? {}
          : {
              '@supports (height: 100dvh)': {
                height: `calc(100dvh - ${FOOTER_HEIGHT_PX}px)`,
              },
            }),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {triggerError && <TestErrorTrigger />}
      <Container
        data-testid="dashboard"
        maxWidth="xl"
        disableGutters={isScaledLayout}
        onClick={handleInteraction}
        sx={{
          py: isScaledLayout ? 2 : { xs: 1, sm: 2 },
          // Side margins are removed on the fixed canvas via
          // disableGutters above: every pixel goes to card width
          // (fewer wrapped lines, larger text).
          // Reserve space for the fixed footer stack (bottom nav + Spotify
          // bar + buffer) so trailing content never slides under it.
          // Measured: 56px nav + 48px bar; the 16px buffer covers bar
          // growth up to 64px before any overlap.
          paddingBottom: isScaledLayout
            ? FOOTER_RESERVE_SCALED
            : FOOTER_RESERVE_RESPONSIVE,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box
          data-testid="dashboard-main-grid"
          sx={getMainGridStyles(isScaledLayout, hrCount)}
        >
          <Box sx={{ height: '100%', minWidth: 0, overflow: 'hidden' }}>
            <TimerDisplay />
          </Box>
          {/* HR section only mounts with live clients: with 0 tiles the
              timer takes the full row and no empty placeholder is left to
              clip inside the locked 340px height. Connection state stays
              visible via the timer's status indicator. */}
          {hrCount > 0 && <HrmConnectionPanel />}
        </Box>
        <Box
          sx={{
            width: '100%',
            mt: 1.5,
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
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
              flexFill
              isShrunk={docIsManuallyShrunk}
              onToggleShrink={() => setDocIsManuallyShrunk((prev) => !prev)}
              refreshKey={refreshKey}
              onRefresh={handleRefresh}
            />
          )}
        </Box>
      </Container>
    </Box>
  )
}

export default DashboardClient
