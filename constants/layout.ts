export const HR_TILE_MIN_HEIGHT = 180
export const HERO_FONT_FAMILY =
  'var(--font-roboto-mono), "Courier New", monospace'
/**
 * Shared floor (px) for dashboard shrink-to-fit type. Cards start from
 * their clamp maxima and step down to this before any scroll fallback,
 * so dense cards stay legible and no exercise is ever hidden.
 */
export const FIT_TYPE_MIN_PX = 14
/**
 * Starting (max) base size (px) for workout-card type. Exercise lines use
 * 1em of this (= the old 1.75rem ceiling); headers scale at 1.3em.
 */
export const CARD_TYPE_MAX_PX = 28
