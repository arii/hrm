import {
  SCALED_WORKOUT_HEADER_REM,
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
    const sizes = [2, 3, 4, 5, 8].map(scaledExerciseFontRem)
    expect(sizes).toEqual([3.3, 3.0, 2.9, 2.9, 2.9])
    // 3.1rem overflows the shorter post-rebalance grid; 2.9rem fits.
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1])
    }
  })

  it('never returns a size below the 2.9rem floor', () => {
    expect(scaledExerciseFontRem(100)).toBeGreaterThanOrEqual(2.9)
  })
})
