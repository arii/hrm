export const HR_TILE_MIN_HEIGHT = '8.5rem'
// Named footer-stack tokens. The bottom nav and the Spotify bar are
// fixed overlays; every layout that needs room for them reserves space
// by composing these instead of restating rem values.
export const BOTTOM_NAV_HEIGHT = '3.5rem'
export const SPOTIFY_BAR_MEASURED_HEIGHT = '3rem'
// Spotify bar growth headroom on the scaled canvas.
export const SPOTIFY_BAR_RESERVE = '1rem'
// Extra buffer on responsive viewports, where the bar has no measured
// reserve of its own.
export const RESPONSIVE_FOOTER_BUFFER = '1.25rem'

export const FOOTER_HEIGHT_PX = 54
// Fixed footer stack dimensions and reserve across all pages.
// Spotify bar sits immediately above the bottom nav.
export const SPOTIFY_BAR_BOTTOM_OFFSET = BOTTOM_NAV_HEIGHT
export const FOOTER_RESERVE_SCALED = `calc(${BOTTOM_NAV_HEIGHT} + ${SPOTIFY_BAR_RESERVE})`
// Responsive viewports reserve the measured bar plus buffer above the
// bottom nav.
export const FOOTER_RESERVE_RESPONSIVE = `calc(${BOTTOM_NAV_HEIGHT} + ${SPOTIFY_BAR_MEASURED_HEIGHT} + ${RESPONSIVE_FOOTER_BUFFER})`

// Fixed dashboard design canvas (target display) for scale-to-fit.
// 16:9: every screen in use (dev machine at 125% scaling, preview
// tablet) is 16:9, so this avoids letterbox side bars. Revert to 1440
// if a 16:10 target display ever needs edge-to-edge instead.
export const DASHBOARD_DESIGN_WIDTH = 1600
export const DASHBOARD_DESIGN_HEIGHT = 900
// Viewports at least this wide scale the fixed dashboard canvas;
// narrower (phone-portrait) ones keep the responsive layout. Tracks
// the sm breakpoint: anything tablet-sized or larger shows the
// target composition scaled to fit.
export const SCALE_TO_FIT_MIN_WIDTH = 600

// Stage attribute that scopes canvas overrides. ScaledStage sets it on
// the stage box only in scaled mode, and components pick the
// target-composition (canvas) styles through SCALED_CANVAS_SELECTOR
// while keeping their responsive styles as the base. In responsive mode
// the stage is display:contents with no attribute, so the selector
// never matches.
// Why an attribute selector and not @container: MUI's sx pipeline
// silently drops nested @container at-rules in the browser (verified:
// zero @container rules reach the document), so canvas overrides ride
// on this plain ancestor selector instead. Specificity (0,2,0) also
// beats every breakpoint/media rule on the element, so the override
// never depends on cascade order.
export const SCALED_CANVAS_SELECTOR = '[data-scaled-canvas] &'

/**
 * Dashboard shell height on the scaled canvas: the fixed canvas minus
 * the in-flow page footer below the shell. Canvas-relative px — viewport
 * units would resolve against the real window and break the canvas
 * proportions when the stage is scaled.
 */
export const DASHBOARD_SHELL_HEIGHT = `${DASHBOARD_DESIGN_HEIGHT - FOOTER_HEIGHT_PX}px`
export const HERO_FONT_FAMILY =
  'var(--font-roboto-mono), "Courier New", monospace'

// Fixed top-row (Timer + HR tiles) height on desktop (md and up). Locking
// this height keeps the exercise tiles below invariant no matter how many
// HR clients connect.
export const DASHBOARD_TOP_ROW_HEIGHT_MD = '340px'

/**
 * Top-row column split between the Timer and the HR tile section.
 *
 * - 0 HR clients: timer takes the full width.
 * - 3 HR clients: timer shrinks to ~38% so 3 tiles fit in a single row.
 * - Otherwise (1, 2, or 4+ in a 2x2 grid): even 50/50 split.
 */
export const getTopRowGridColumns = (count: number) => {
  if (count === 0) return { xs: '1fr', md: '1fr' }
  if (count === 3) return { xs: '1fr', md: '38fr 62fr' }
  return { xs: '1fr', md: '50fr 50fr' }
}

interface HrGridConfig {
  gridTemplateColumns: string
  gridTemplateRows: string
}

/**
 * Internal HR tile container grid for a given connected-client count.
 * 1-3 tiles share a single row; 4+ shrink into a 2-row grid that fits
 * inside the locked top-row height.
 */
export const getHrGridConfig = (count: number): HrGridConfig => {
  if (count === 1) {
    return {
      gridTemplateColumns: '1fr',
      gridTemplateRows: '1fr',
    }
  }
  if (count === 2) {
    return {
      gridTemplateColumns: 'repeat(2, 1fr)',
      gridTemplateRows: '1fr',
    }
  }
  if (count === 3) {
    return {
      gridTemplateColumns: 'repeat(3, 1fr)',
      gridTemplateRows: '1fr',
    }
  }
  // 4 or more: shrink tiles into a 2-row grid within the fixed height
  const cols = Math.ceil(count / 2)
  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  }
}
