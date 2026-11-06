/**
 * Font sizing for the native workout table (WorkoutPhaseGrid).
 *
 * On the scaled fixed canvas the workout area has a fixed height and must
 * not scroll, so exercise and header text are sized from the content itself:
 * fewer rows per card allow larger text, more rows and longer exercise names
 * step it down so the tallest card still fits without clipping.
 */

/** Header ceiling size (rem) on the scaled canvas. */
export const SCALED_WORKOUT_HEADER_REM = 2.8

/**
 * Calculates proportional header size based on exercise font size.
 * Keeps header slightly larger than or equal to exercises (~1.05x) while
 * capping at 2.85rem so 2-word headers fit cleanly on a single line,
 * and maintaining balance down to 1.8rem.
 */
export const scaledWorkoutHeaderRem = (exerciseRem: number): number => {
  if (!Number.isFinite(exerciseRem) || exerciseRem <= 0) {
    return SCALED_WORKOUT_HEADER_REM
  }
  return Math.max(1.8, Math.min(2.85, Number((exerciseRem * 1.05).toFixed(2))))
}

/**
 * Estimates the maximum number of effective rows across all columns,
 * taking into account line wrapping based on exercise text length and
 * column density.
 */
export const estimateEffectiveRows = (
  columns: string[][] | number,
  columnCount?: number
): number => {
  if (typeof columns === 'number') {
    return columns
  }
  if (!Array.isArray(columns) || columns.length === 0) {
    return 0
  }
  const cols = columnCount ?? columns.length
  // On scaled 1600px canvas, 5+ columns give ~275px card content width (~18 chars/line).
  // 4 columns give ~350px (~22 chars/line), 3 or fewer give ~26 chars/line.
  const charsPerLine = cols >= 5 ? 18 : cols === 4 ? 22 : 26

  return columns.reduce((tallest, col) => {
    const lines = (col ?? []).reduce((sum, exercise) => {
      const len = exercise ? exercise.trim().length : 0
      return sum + Math.max(1, Math.ceil(len / charsPerLine))
    }, 0)
    return Math.max(tallest, lines)
  }, 0)
}

/**
 * Exercise text size (rem) on the scaled canvas for a grid whose
 * tallest card holds `maxRowsOrColumns` exercises or columns data. Non-positive
 * input falls back to the roomiest band.
 */
export const scaledExerciseFontRem = (
  maxRowsOrColumns: number | string[][],
  columnCount?: number
): number => {
  const effectiveRows =
    typeof maxRowsOrColumns === 'number'
      ? maxRowsOrColumns
      : estimateEffectiveRows(maxRowsOrColumns, columnCount)

  if (!Number.isFinite(effectiveRows) || effectiveRows <= 2) return 3.0
  if (effectiveRows === 3) return 2.9
  if (effectiveRows === 4) return 2.8
  if (effectiveRows === 5) return 2.7
  if (effectiveRows === 6) return 2.4
  if (effectiveRows === 7) return 2.1
  if (effectiveRows === 8) return 1.9
  return Math.max(1.6, Number((1.9 - (effectiveRows - 8) * 0.1).toFixed(1)))
}
