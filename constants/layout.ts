export const HR_TILE_MIN_HEIGHT = '8.5rem'
export const FOOTER_HEIGHT_PX = 54
// Fixed footer stack dimensions and reserve across all pages.
// Spotify bar sits immediately above the 3.5rem bottom nav bar.
export const SPOTIFY_BAR_BOTTOM_OFFSET = '3.5rem'
// Spotify bar measured height: 48px (~3rem), plus 16px (1rem) buffer in scaled mode
// covers bar growth up to 64px without overlap.
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
