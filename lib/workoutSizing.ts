/**
 * Deterministic text fit for the scaled-canvas workout grid (OD-5).
 *
 * The old implementation converged from observed overflow: measure after
 * paint, step the font down 0.1rem per commit, re-run on every settle
 * signal. Every timing race in that loop shipped as a user-visible
 * regression. This module replaces it with a one-shot fit: the grid
 * measures real font metrics once through an adapter and this function
 * computes the largest sizes that fit — analytically, never from
 * overflow observation. Same input, same output; a recompute from any
 * trigger (font load, resize, content change) is a full, idempotent
 * recomputation that can never step or ratchet.
 */

/**
 * Font size the metrics adapter measures at, in px. Text width scales
 * linearly with font size, so one measurement per word at this
 * reference is enough to model wrapping at any candidate size.
 */
export const REFERENCE_FONT_PX = 100

/**
 * Root font size the scaled canvas resolves rem against (Chromium's
 * default; the app sets no other html font-size).
 */
const ROOT_FONT_PX = 16

/** Hard floor for exercise text on the scaled canvas. */
export const MIN_EXERCISE_REM = 1.3
/** Roomiest exercise size (the old content-estimate band ceiling). */
const MAX_EXERCISE_REM = 3.0

const MIN_HEADER_REM = 1.8
const MAX_HEADER_REM = 2.85
// Headers track exercise size so the two stay visually balanced. The
// ratio is applied inside this one fit (never as a separate component
// heuristic) and is clamped so 2-word headers fit on one line.
const HEADER_TO_EXERCISE_RATIO = 1.05

const EXERCISE_LINE_HEIGHT = 1.15
const HEADER_LINE_HEIGHT = 1.15

// Layout constants mirroring the grid's MUI sx values so the model and
// the rendered box cannot drift: `gap: 2` -> 16px, card `p: 1.5` ->
// 12px, Divider `my: 1` -> 8px margins + 1px rule, Stack `spacing:
// 0.75` -> 6px, `minmax(min(100%, 240px), 1fr)` -> 240px card floor.
const GRID_GAP_PX = 16
const CARD_MIN_WIDTH_PX = 240
const CARD_PADDING_PX = 12
const DIVIDER_PX = 17
const EXERCISE_GAP_PX = 6

/** Real font metrics, measured by the caller (never by this module). */
export interface WorkoutFontMetrics {
  /** Measured width of `text` at {@link REFERENCE_FONT_PX}, in px. */
  measureTextPx: (text: string) => number
}

export interface WorkoutFitInput {
  /** The grid's actual box, in (unscaled) canvas px. */
  box: { widthPx: number; heightPx: number }
  /** headers: phase titles; columns: exercises per phase. */
  content: { headers: string[]; columns: string[][] }
  fontMetrics: WorkoutFontMetrics
}

export interface WorkoutFit {
  exerciseRem: number
  headerRem: number
}

export function fitHeaderRem(
  headerRem: number,
  availableWidthPx: number,
  widestTokenPx: number
): number {
  if (availableWidthPx <= 0 || widestTokenPx <= availableWidthPx) {
    return headerRem
  }
  return Math.floor((headerRem * availableWidthPx * 100) / widestTokenPx) / 100
}

/**
 * Deterministic: same input, same output. Converges in one call via a
 * bounded binary search over real metrics — never from overflow.
 */
export function computeWorkoutFit(input: WorkoutFitInput): WorkoutFit {
  const { box, content, fontMetrics } = input
  const columnCount = content.headers.length
  if (
    !Number.isFinite(box.widthPx) ||
    !Number.isFinite(box.heightPx) ||
    box.widthPx <= 0 ||
    box.heightPx <= 0 ||
    columnCount === 0
  ) {
    // Degenerate box/content: nothing to fit. The floor sizes are the
    // only values guaranteed never to overflow once a real box exists,
    // and the grid recomputes from scratch when the box settles.
    return { exerciseRem: MIN_EXERCISE_REM, headerRem: MIN_HEADER_REM }
  }

  // Mirror the CSS grid: repeat(auto-fit, minmax(240px, 1fr)) wraps
  // cards once fewer than the floor fits per row.
  const cardsPerRow = Math.min(
    columnCount,
    Math.max(
      1,
      Math.floor(
        (box.widthPx + GRID_GAP_PX) / (CARD_MIN_WIDTH_PX + GRID_GAP_PX)
      )
    )
  )
  const rows = Math.ceil(columnCount / cardsPerRow)
  const cardWidthPx =
    (box.widthPx - GRID_GAP_PX * (cardsPerRow - 1)) / cardsPerRow
  const cardHeightPx = (box.heightPx - GRID_GAP_PX * (rows - 1)) / rows

  const fits = (exerciseRem: number): boolean =>
    content.headers.every((header, index) => {
      const exercises = content.columns[index] ?? []
      return (
        cardContentHeightPx(
          header,
          exercises,
          cardWidthPx,
          exerciseRem,
          fontMetrics
        ) <= cardHeightPx
      )
    })

  if (fits(MAX_EXERCISE_REM)) {
    return fitAt(MAX_EXERCISE_REM)
  }
  if (!fits(MIN_EXERCISE_REM)) {
    return fitAt(MIN_EXERCISE_REM)
  }

  // Bounded search between the floor and the ceiling; monotone in
  // exerciseRem, so bisection converges deterministically.
  let low = MIN_EXERCISE_REM
  let high = MAX_EXERCISE_REM
  for (let i = 0; i < 24; i += 1) {
    const mid = (low + high) / 2
    if (fits(mid)) {
      low = mid
    } else {
      high = mid
    }
  }
  // Snap to the snapshot-stable precision, then never round past fits.
  let exerciseRem = Math.floor(low * 100) / 100
  while (exerciseRem > MIN_EXERCISE_REM && !fits(exerciseRem)) {
    exerciseRem = Math.floor((exerciseRem - 0.01) * 100) / 100
  }
  return fitAt(exerciseRem)
}

const fitAt = (exerciseRem: number): WorkoutFit => ({
  exerciseRem,
  headerRem: clampRem(
    MIN_HEADER_REM,
    MAX_HEADER_REM,
    exerciseRem * HEADER_TO_EXERCISE_RATIO
  ),
})

const clampRem = (min: number, max: number, value: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * Modeled rendered height of one card's content at `exerciseRem`:
 * padding + header lines + divider + wrapped exercise stack + gaps.
 * Pure — all wrapping math runs on the measured metrics.
 */
const cardContentHeightPx = (
  header: string,
  exercises: string[],
  cardWidthPx: number,
  exerciseRem: number,
  metrics: WorkoutFontMetrics
): number => {
  const usablePx = Math.max(1, cardWidthPx - 2 * CARD_PADDING_PX)
  const headerRem = clampRem(
    MIN_HEADER_REM,
    MAX_HEADER_REM,
    exerciseRem * HEADER_TO_EXERCISE_RATIO
  )
  const headerPx = headerRem * ROOT_FONT_PX
  const headerLines = wrapLines(header, usablePx, headerPx, metrics)
  const exercisePx = exerciseRem * ROOT_FONT_PX
  const stackPx = exercises.reduce(
    (sum, exercise) =>
      sum +
      wrapLines(exercise, usablePx, exercisePx, metrics) *
        exercisePx *
        EXERCISE_LINE_HEIGHT,
    0
  )
  const gapsPx = Math.max(0, exercises.length - 1) * EXERCISE_GAP_PX
  return (
    2 * CARD_PADDING_PX +
    headerLines * headerPx * HEADER_LINE_HEIGHT +
    DIVIDER_PX +
    stackPx +
    gapsPx
  )
}

/**
 * Greedy word wrap at `fontPx`, counted in lines. Widths scale linearly
 * from the reference measurement, so the model uses exactly the metrics
 * the loaded font reports.
 */
const wrapLines = (
  text: string,
  usablePx: number,
  fontPx: number,
  metrics: WorkoutFontMetrics
): number => {
  const scale = fontPx / REFERENCE_FONT_PX
  const widthOf = (word: string): number => metrics.measureTextPx(word) * scale
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  const spacePx = widthOf(' ')
  let lines = 1
  let lineWidth = 0
  for (const word of words) {
    const wordPx = widthOf(word)
    if (lineWidth === 0 || lineWidth + spacePx + wordPx > usablePx) {
      if (lineWidth !== 0) lines += 1
      lineWidth = wordPx
    } else {
      lineWidth += spacePx + wordPx
    }
  }
  return lines
}

/**
 * Metrics adapter: measures with a canvas 2D context using the grid's
 * own font stack. Environments without canvas support (jsdom) get a
 * fixed char-width estimate — still deterministic, still one metric
 * source feeding the same fit.
 */
export const createWorkoutTextMeasurer = (
  fontFamily: string
): WorkoutFontMetrics => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      measureTextPx: (text) => text.length * REFERENCE_FONT_PX * 0.6,
    }
  }
  ctx.font = `${REFERENCE_FONT_PX}px ${fontFamily}`
  return { measureTextPx: (text) => ctx.measureText(text).width }
}
