/**
 * Font sizing for the native workout table (WorkoutPhaseGrid).
 *
 * On the scaled fixed canvas the workout area has a fixed height and must
 * not scroll, so exercise text is sized from the content itself: fewer
 * rows per card allow larger text, more rows and longer exercise names
 * step it down so the tallest card still fits without clipping.
 */

/** Header size (rem) on the scaled canvas. */
export const SCALED_WORKOUT_HEADER_REM = 3.3

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
  // On scaled 1600px canvas, 5+ columns give ~275px card content width (~14 chars/line).
  // 4 columns give ~350px (~18 chars/line), 3 or fewer give ~22+ chars/line.
  const charsPerLine = cols >= 5 ? 14 : cols === 4 ? 18 : 22

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

  if (!Number.isFinite(effectiveRows) || effectiveRows <= 2) return 3.3
  if (effectiveRows === 3) return 2.8
  if (effectiveRows === 4) return 2.5
  if (effectiveRows === 5) return 2.2
  if (effectiveRows === 6) return 1.9
  if (effectiveRows === 7) return 1.7
  if (effectiveRows === 8) return 1.5
  return Math.max(1.2, Number((1.5 - (effectiveRows - 8) * 0.1).toFixed(1)))
}
