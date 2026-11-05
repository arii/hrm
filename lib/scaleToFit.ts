/**
 * Scale-to-fit helpers for the dashboard.
 *
 * The dashboard is designed against a fixed canvas (the target
 * display size). On tablet-sized and larger viewports the canvas
 * renders at that exact size and is uniformly scaled to fit inside
 * the window (letterboxed), so the whole dashboard is always visible
 * with no scrolling and no cut-off content. Narrow viewports keep
 * the responsive layout instead.
 */

/**
 * Uniform scale that fits a design canvas inside a viewport: the
 * whole canvas stays visible, bars fill the leftover axis.
 * Returns 1 for non-positive or non-finite inputs.
 */
export const computeScaleToFit = (
  viewportWidth: number,
  viewportHeight: number,
  designWidth: number,
  designHeight: number
): number => {
  const inputs = [viewportWidth, viewportHeight, designWidth, designHeight]
  if (inputs.some((value) => !Number.isFinite(value) || value <= 0)) {
    return 1
  }
  return Math.min(viewportWidth / designWidth, viewportHeight / designHeight)
}

/**
 * Whether a viewport gets the scaled fixed canvas (true) or the
 * responsive layout (false).
 */
export const shouldScaleToFit = (
  viewportWidth: number,
  minWidth: number
): boolean => viewportWidth >= minWidth
