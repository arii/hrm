'use client'

import Container from '@mui/material/Container'
import { SxProps } from '@mui/material'
import dynamic from 'next/dynamic'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import DashboardSectionLoadingSkeleton from '@/components/DashboardSectionLoadingSkeleton'
import { useContext, useState } from 'react'
import HrmConnectionPanel from '@/components/HrmConnectionPanel'
import { useInScaledStage } from '@/components/ScaledStage'
import TimerDisplay from '@/components/TimerDisplay'
import { HrmDataContext } from '@/context/WebSocketContext'
import {
  DASHBOARD_SHELL_HEIGHT,
  DASHBOARD_TOP_ROW_HEIGHT_MD,
  FOOTER_HEIGHT_PX,
  FOOTER_RESERVE_RESPONSIVE,
  FOOTER_RESERVE_SCALED,
  SCALED_CANVAS_SELECTOR,
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

// Target composition: the two-column grid with the fixed top-row
// height. The responsive base stacks phones (xs) and applies the
// two-column composition from md up; inside the scaled canvas
// SCALED_CANVAS_SELECTOR pins that composition at every scaled viewport
// (including 600–899px windows, where the md media query would not
// fire), so the canvas never reflips with the real window size.
//
// The top row has a strict fixed height on desktop so connecting a 3rd
// or 4th HR client never stretches the timer vertically or pushes the
// exercise tiles below. HR count only changes the horizontal split:
// 3 tiles shrink the timer to ~38%, every other count uses 50/50.
const getMainGridStyles = (hrCount: number): SxProps => {
  // Single source of truth for the Timer/HR split.
  const topRowColumns = getTopRowGridColumns(hrCount)
  return {
    display: 'grid',
    gridTemplateColumns: {
      xs: '1fr',
      // Two-column top row from md up so the fixed height applies on
      // desktop; phones keep the stacked (auto-height) layout.
      md: topRowColumns.md,
    },
    gap: 1.5,
    // Fixed height on desktop prevents Timer from growing vertically and
    // prevents pushing Exercise tiles. xs stays auto (stacked layout).
    height: {
      xs: 'auto',
      md: DASHBOARD_TOP_ROW_HEIGHT_MD,
    },
    minHeight: { md: DASHBOARD_TOP_ROW_HEIGHT_MD },
    maxHeight: { md: DASHBOARD_TOP_ROW_HEIGHT_MD },
    // The canvas pin rides one selector so all three row constraints
    // (and the columns) flip together, above any breakpoint rule.
    [SCALED_CANVAS_SELECTOR]: {
      gridTemplateColumns: topRowColumns.md,
      height: DASHBOARD_TOP_ROW_HEIGHT_MD,
      minHeight: DASHBOARD_TOP_ROW_HEIGHT_MD,
      maxHeight: DASHBOARD_TOP_ROW_HEIGHT_MD,
    },
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
  // Only CSS-inexpressible decisions read the regime in JS: this prop
  // gate and nothing else (styles go through SCALED_CANVAS_SELECTOR
  // below). The stage context defaults to false outside ScaledStage.
  const isScaledLayout = useInScaledStage()
  const [refreshKey, setRefreshKey] = useState(0)
  // Active HR client count drives the top-row horizontal split (timer
  // shrinks to ~38% for exactly 3 tiles). Reads the raw context so the
  // component still renders without a provider (unit tests, stories).
  const hrmData = useContext(HrmDataContext)
  const hrCount = Array.isArray(hrmData) ? hrmData.length : 0

  const handleRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1)
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
        // never scrolls. On the scaled canvas the shell height is
        // canvas-relative px (DASHBOARD_SHELL_HEIGHT) — viewport units
        // would resolve against the real window, not the canvas. The
        // selector's (0,2,0) specificity beats the @supports rule below.
        height: `calc(100vh - ${FOOTER_HEIGHT_PX}px)`,
        '@supports (height: 100dvh)': {
          height: `calc(100dvh - ${FOOTER_HEIGHT_PX}px)`,
        },
        [SCALED_CANVAS_SELECTOR]: { height: DASHBOARD_SHELL_HEIGHT },
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
        sx={{
          // The sm value is the target-composition pin: scaled viewports
          // are always ≥ SCALE_TO_FIT_MIN_WIDTH, which tracks the sm
          // breakpoint, so the canvas never sees the xs value.
          py: { xs: 1, sm: 2 },
          // Side margins are removed on the fixed canvas via
          // disableGutters above: every pixel goes to card width
          // (fewer wrapped lines, larger text).
          // Reserve space for the fixed footer stack (bottom nav + Spotify
          // bar + buffer) so trailing content never slides under it.
          // Measured: 56px nav + 48px bar; the 16px buffer covers bar
          // growth up to 64px before any overlap. The canvas reserve
          // (nav + measured bar headroom) rides the canvas selector:
          // (0,2,0) specificity beats the py media rule above, which
          // would otherwise clobber a plain paddingBottom.
          paddingBottom: FOOTER_RESERVE_RESPONSIVE,
          [SCALED_CANVAS_SELECTOR]: { paddingBottom: FOOTER_RESERVE_SCALED },
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Box data-testid="dashboard-main-grid" sx={getMainGridStyles(hrCount)}>
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
