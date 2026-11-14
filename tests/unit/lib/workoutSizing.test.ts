import {
  MIN_EXERCISE_REM,
  REFERENCE_FONT_PX,
  computeWorkoutFit,
  type WorkoutFitInput,
  type WorkoutFontMetrics,
} from '../../../lib/workoutSizing'

// Deterministic metric stub: monospace 0.6em advance at the reference
// size. widthPx(text) at any candidate size is text.length * 0.6 * size.
const monospaceMetrics = (emPerChar = 0.6): WorkoutFontMetrics => ({
  measureTextPx: (text) => text.length * emPerChar * REFERENCE_FONT_PX,
})

// Test oracle: independent greedy-wrap height model used to assert the
// computed fit actually lands inside the box (non-overflow criterion).
const modeledHeightPx = (
  input: WorkoutFitInput,
  cardWidthPx: number,
  fit: { exerciseRem: number; headerRem: number }
): number => {
  const usable = cardWidthPx - 24
  const lines = (text: string, sizePx: number): number => {
    const width = (t: string) =>
      input.fontMetrics.measureTextPx(t) * (sizePx / REFERENCE_FONT_PX)
    const words = text.trim().split(/\s+/)
    let count = 1
    let lineWidth = 0
    for (const word of words) {
      const w = width(word)
      if (lineWidth !== 0 && lineWidth + width(' ') + w > usable) {
        count += 1
        lineWidth = w
      } else {
        lineWidth += lineWidth === 0 ? w : width(' ') + w
      }
    }
    return count
  }
  return (
    24 +
    lines(input.content.headers[0], fit.headerRem * 16) * fit.headerRem * 16 +
    17 +
    (input.content.columns[0] ?? []).reduce(
      (sum, ex) =>
        sum + lines(ex, fit.exerciseRem * 16) * fit.exerciseRem * 16 * 1.15,
      0
    ) +
    Math.max(0, (input.content.columns[0]?.length ?? 0) - 1) * 12
  )
}

const makeInput = (
  overrides: Partial<WorkoutFitInput> = {}
): WorkoutFitInput => ({
  box: { widthPx: 1568, heightPx: 700 },
  content: {
    headers: ['20/10', '3 x 10'],
    columns: [
      ['Jumping Jacks', 'High Knees'],
      ['Squats (10 reps)', 'Plank'],
    ],
  },
  fontMetrics: monospaceMetrics(),
  ...overrides,
})

describe('computeWorkoutFit', () => {
  it('is deterministic: same input, same output', () => {
    const input = makeInput()
    expect(computeWorkoutFit(input)).toStrictEqual(computeWorkoutFit(input))
  })

  it('is idempotent: recomputing from an unchanged environment never changes the sizes', () => {
    const input = makeInput()
    const first = computeWorkoutFit(input)
    // A recompute observes the same box, content, and metrics; it must
    // land on exactly the same sizes (never step from a prior result).
    const second = computeWorkoutFit(input)
    expect(second.exerciseRem).toBe(first.exerciseRem)
    expect(second.headerRem).toBe(first.headerRem)
  })

  it('computes sizes whose modeled layout fits the box across content shapes', () => {
    const shapes: { name: string; content: WorkoutFitInput['content'] }[] = [
      {
        name: 'short text, few columns',
        content: {
          headers: ['AMRAP'],
          columns: [['Row']],
        },
      },
      {
        name: 'long wrapping text, narrow cards',
        content: {
          headers: ['20/10', '3 x 10', 'Tabata', 'EMOM'],
          columns: [
            ['Alternating dumbbell floor press'],
            ['Band bridge lat pull to chest'],
            ['Ab mat butterfly sit up'],
            ['Single arm overhead kettlebell carry'],
          ],
        },
      },
      {
        name: 'many columns',
        content: {
          headers: ['a', 'b', 'c', 'd', 'e', 'f'],
          columns: [
            ['Burpees'],
            ['Mountain climbers'],
            ['Jumping jacks'],
            ['Push presses'],
            ['Box step ups'],
            ['Plank holds'],
          ],
        },
      },
      {
        name: 'headers-only payload',
        content: {
          headers: ['20/10', '3 x 10'],
          columns: [],
        },
      },
    ]
    for (const shape of shapes) {
      const input = makeInput({ content: shape.content })
      const fit = computeWorkoutFit(input)
      expect(fit.exerciseRem).toBeGreaterThanOrEqual(MIN_EXERCISE_REM)
      expect(fit.exerciseRem).toBeLessThanOrEqual(3.0)
      expect(fit.headerRem).toBeGreaterThanOrEqual(1.8)
      expect(fit.headerRem).toBeLessThanOrEqual(2.85)
      // Single-row shapes must fit their modeled height in the box.
      const cardsPerRow = Math.min(
        shape.content.headers.length,
        Math.floor((input.box.widthPx + 16) / (240 + 16))
      )
      if (cardsPerRow >= shape.content.headers.length) {
        expect(
          modeledHeightPx(
            input,
            (input.box.widthPx - 16 * (cardsPerRow - 1)) / cardsPerRow,
            fit
          )
        ).toBeLessThanOrEqual(input.box.heightPx)
      }
    }
  })

  it('never goes below the 1.4rem floor even for absurd content', () => {
    const longText = 'Very long unbreakable compound exercise name '.repeat(12)
    const input = makeInput({
      content: {
        headers: ['Tabata'],
        columns: [Array.from({ length: 40 }, () => longText)],
      },
    })
    expect(computeWorkoutFit(input).exerciseRem).toBe(MIN_EXERCISE_REM)
  })

  it('reaches the roomy ceiling for tiny content', () => {
    const fit = computeWorkoutFit(
      makeInput({
        content: { headers: ['HIIT'], columns: [['Row', 'Rest']] },
      })
    )
    expect(fit.exerciseRem).toBe(3.0)
  })

  it('monotonically sizes down as content grows', () => {
    const light = computeWorkoutFit(makeInput()).exerciseRem
    const heavy = computeWorkoutFit(
      makeInput({
        content: {
          headers: ['20/10'],
          columns: [
            [
              'Alternating dumbbell floor press',
              'Band bridge lat pull to chest',
              'Ab mat butterfly sit up',
              'Single arm overhead kettlebell carry',
              'Renegade row to plank push up',
              'Slow eccentric Bulgarian split squat',
              'Half kneeling cable chop with press',
              'Standing broad jump reset repeat',
              'Feet elevated trap bar dead lock',
              'Lateral bound to single leg squat',
              'Weighted dead bug pullover press',
              'Isometric mid-thigh pull hold',
            ],
          ],
        },
      })
    ).exerciseRem
    expect(heavy).toBeLessThan(light)
  })

  it('derives the header inside one fit, never below 1.8rem or above 2.85rem', () => {
    const roomy = computeWorkoutFit(
      makeInput({
        content: { headers: ['HIIT'], columns: [['Row']] },
      })
    )
    expect(roomy.headerRem).toBe(2.85) // 3.0 * 1.05 capped
    const floored = computeWorkoutFit(
      makeInput({
        content: {
          headers: ['Tabata'],
          columns: [
            Array.from({ length: 40 }, () => 'Ab mat butterfly sit up'),
          ],
        },
      })
    )
    expect(floored.headerRem).toBe(1.8) // floored alongside the exercise floor
  })

  it('returns the floor for degenerate boxes instead of guessing', () => {
    expect(
      computeWorkoutFit(makeInput({ box: { widthPx: 0, heightPx: 0 } }))
    ).toEqual({
      exerciseRem: MIN_EXERCISE_REM,
      headerRem: 1.8,
    })
  })
})
