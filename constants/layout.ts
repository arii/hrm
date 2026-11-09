export const HR_TILE_MIN_HEIGHT = '8.5rem'
export const FOOTER_HEIGHT_PX = 54
// Fixed footer stack dimensions and reserve across all pages.
// Spotify bar sits immediately above the 3.5rem bottom nav bar.
export const SPOTIFY_BAR_BOTTOM_OFFSET = '3.5rem'
// 56px bottom nav + 16px buffer; the measured 48px Spotify bar is not
// covered — confirm the overlay needs no reserve before trusting this.
export const FOOTER_RESERVE_SCALED = 'calc(3.5rem + 1rem)'
// Non-scaled viewports reserve 3rem bar + 1.25rem buffer above the 3.5rem bottom nav.
export const FOOTER_RESERVE_RESPONSIVE = 'calc(3.5rem + 3rem + 1.25rem)'

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
