export const HR_TILE_MIN_HEIGHT = 180
export const HERO_FONT_FAMILY =
  'var(--font-roboto-mono), "Courier New", monospace'
/**
 * Shared floor (px) for dashboard shrink-to-fit type. Cards start from
 * their clamp maxima and step down to this. Sized so the observed
 * 11-exercise max fits the fixed cards region (~50% of a 696px viewport
 * with the footer budget) with em-scaled card chrome.
 */
export const FIT_TYPE_MIN_PX = 12
/**
 * Grow-to-fill ceiling (px) for workout-card type. The uniform fit starts
 * here and shrinks to the largest size that fills the box, so sparse
 * cards render big and readable-from-afar instead of small with white
 * space. Headers scale at 1.3em of the fitted base.
 */
export const CARD_TYPE_MAX_PX = 64
