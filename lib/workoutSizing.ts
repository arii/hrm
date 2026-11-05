/**
 * Font sizing for the native workout table (WorkoutPhaseGrid).
 *
 * On the scaled fixed canvas the workout area has a fixed height and must
 * not scroll, so exercise text is sized from the content itself: fewer
 * rows per card allow larger text, more rows step it down so the tallest
 * card still fits. Pure helpers: unit-tested.
 */

/** Header size (rem) on the scaled canvas. */
export const SCALED_WORKOUT_HEADER_REM = 3.3

/**
 * Exercise text size (rem) on the scaled canvas for a grid whose
 * tallest card holds `maxRows` exercises. Non-positive input falls
 * back to the roomiest band.
 */
export const scaledExerciseFontRem = (maxRows: number): number => {
  if (!Number.isFinite(maxRows) || maxRows <= 2) return 3.3
  if (maxRows === 3) return 3.0
  // Grid lost 64px to the taller timer row (490 -> 426px), so the
  // floor steps back to what fits the shorter budget. Re-probe
  // before raising: Finisher-like 5-row cards are the constraint.
  return 2.9
}
