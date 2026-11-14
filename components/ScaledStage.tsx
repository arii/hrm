'use client'

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { useTheme } from '@mui/material/styles'
import {
  DASHBOARD_DESIGN_HEIGHT,
  DASHBOARD_DESIGN_WIDTH,
  SCALE_TO_FIT_MIN_WIDTH,
} from '@/constants/layout'
import { computeScaleToFit, shouldScaleToFit } from '@/lib/scaleToFit'

// Layout effect on the client (measure before paint: no flash of the
// unscaled layout), plain effect for the server render.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect

// Whether the calling component renders inside a ScaledStage that is
// currently in scaled (fixed-canvas) mode. Defaults to false so
// standalone mounts (component tests, other pages) read responsive —
// the same default the retired useIsScaledLayout context had. Only
// CSS-inexpressible decisions should consume this: pure size changes
// belong in CSS via SCALED_CANVAS_SELECTOR.
const ScaledStageContext = createContext(false)

export const useInScaledStage = (): boolean => useContext(ScaledStageContext)

interface ViewportSize {
  width: number
  height: number
}

const readViewportSize = (): ViewportSize | null =>
  typeof window === 'undefined'
    ? null
    : { width: window.innerWidth, height: window.innerHeight }

const sameSize = (
  current: ViewportSize | null,
  next: ViewportSize | null
): boolean =>
  current !== null &&
  next !== null &&
  current.width === next.width &&
  current.height === next.height

// Two decimals keep computed pixel sizes exact (1440 * 1.2 is not
// exactly 1728 in floating point) without visible rounding.
const round2 = (value: number): number => Math.round(value * 100) / 100

/**
 * Scale-to-fit stage for the dashboard route.
 *
 * On viewports at least SCALE_TO_FIT_MIN_WIDTH wide, children render
 * inside a fixed DASHBOARD_DESIGN_WIDTH x DASHBOARD_DESIGN_HEIGHT
 * canvas uniformly scaled to fit the window (letterboxed), so the
 * whole dashboard is always visible with no page scroll and no
 * cut-off content. Fixed descendants (bottom nav, Spotify bar)
 * anchor to the canvas via the transform containing block. Narrower
 * viewports keep the responsive layout instead.
 *
 * Plain divs with inline styles (not MUI sx): every value here is
 * dynamic, and inline styles keep the scale unit-assertable.
 */
const ScaledStage = ({ children }: { children: ReactNode }) => {
  const theme = useTheme()
  // Null until measured on the client, so server HTML and the first
  // client render match (unscaled) and hydration stays clean. The
  // layout effect below re-renders before paint, so no flash.
  const [viewport, setViewport] = useState<ViewportSize | null>(null)

  useIsomorphicLayoutEffect(() => {
    const update = () => {
      const next = readViewportSize()
      setViewport((prev) => (sameSize(prev, next) ? prev : next))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const scaled =
    viewport !== null &&
    shouldScaleToFit(viewport.width, SCALE_TO_FIT_MIN_WIDTH)
  const scale =
    viewport === null
      ? 1
      : computeScaleToFit(
          viewport.width,
          viewport.height,
          DASHBOARD_DESIGN_WIDTH,
          DASHBOARD_DESIGN_HEIGHT
        )

  // All three wrappers always render so toggling modes only changes
  // styles and never remounts the dashboard subtree. Unscaled, they
  // are display:contents and vanish from layout entirely.
  const transparent: CSSProperties = { display: 'contents' }
  // 100vh (not dvh): scaled mode is tablet/desktop-only, where they agree.
  const outerStyle: CSSProperties = scaled
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: theme.palette.background.default,
      }
    : transparent
  const sizerStyle: CSSProperties = scaled
    ? {
        width: `${round2(DASHBOARD_DESIGN_WIDTH * scale)}px`,
        height: `${round2(DASHBOARD_DESIGN_HEIGHT * scale)}px`,
        flexShrink: 0,
      }
    : transparent
  const stageStyle: CSSProperties = scaled
    ? {
        width: `${DASHBOARD_DESIGN_WIDTH}px`,
        height: `${DASHBOARD_DESIGN_HEIGHT}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        // Scopes canvas overrides: components select the
        // target-composition styles via SCALED_CANVAS_SELECTOR (see
        // constants/layout.ts). Only rendered in scaled mode — responsive
        // mode renders display:contents with no attribute, so the
        // selector never matches and responsive base styles hold.
      }
    : transparent

  return (
    <ScaledStageContext.Provider value={scaled}>
      <div data-testid="scaled-stage-outer" style={outerStyle}>
        <div data-testid="scaled-stage-sizer" style={sizerStyle}>
          {/* The attribute is a JSX prop, not a style-object key: React
              renders style-object keys as CSS declarations only. */}
          <div
            data-testid="scaled-stage"
            data-scaled-canvas={scaled ? '' : undefined}
            style={stageStyle}
          >
            {children}
          </div>
        </div>
      </div>
    </ScaledStageContext.Provider>
  )
}

export default ScaledStage
