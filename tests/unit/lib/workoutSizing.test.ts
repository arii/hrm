import {
  SCALED_WORKOUT_HEADER_REM,
  estimateEffectiveRows,
  scaledExerciseFontRem,
} from '../../../lib/workoutSizing'

describe('workoutSizing', () => {
  it('keeps the header size fixed and larger than the old 2.75rem', () => {
    expect(SCALED_WORKOUT_HEADER_REM).toBeGreaterThan(2.75)
  })

  it('uses the roomiest exercise size for short cards', () => {
    expect(scaledExerciseFontRem(0)).toBe(3.3)
    expect(scaledExerciseFontRem(1)).toBe(3.3)
    expect(scaledExerciseFontRem(2)).toBe(3.3)
  })

  it('steps exercise text down as the tallest card grows', () => {
    const sizes = [2, 3, 4, 5, 8].map((n) => scaledExerciseFontRem(n))
    expect(sizes).toEqual([3.3, 2.8, 2.5, 2.2, 1.5])
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1])
    }
  })

  it('estimates effective rows taking long exercise line wrapping into account', () => {
    const columns = [
      ['Slider tucks', 'Dead bug', 'L sits'],
      ['Band bridge lat pull', 'Alt floor press', 'Ab mat butterfly sit up'],
    ]
    // 5 columns -> narrow cards, exercises with ~20+ chars wrap to multiple lines
    expect(estimateEffectiveRows(columns, 5)).toBeGreaterThan(3)
    expect(scaledExerciseFontRem(columns, 5)).toBeLessThan(2.8)
  })

  it('never returns a size below the 1.2rem floor', () => {
    expect(scaledExerciseFontRem(100)).toBeGreaterThanOrEqual(1.2)
  })
})
