import {
  SCALED_WORKOUT_HEADER_REM,
  estimateEffectiveRows,
  scaledExerciseFontRem,
  scaledWorkoutHeaderRem,
} from '../../../lib/workoutSizing'

describe('workoutSizing', () => {
  it('caps the header size appropriately to prevent 2-line title wrapping', () => {
    expect(SCALED_WORKOUT_HEADER_REM).toBe(2.6)
  })

  it('scales header proportionally with exercise font size', () => {
    expect(scaledWorkoutHeaderRem(2.6)).toBe(2.6)
    expect(scaledWorkoutHeaderRem(2.2)).toBe(2.53)
    expect(scaledWorkoutHeaderRem(1.6)).toBe(1.84)
    expect(scaledWorkoutHeaderRem(1.2)).toBe(1.8) // floor
  })

  it('uses the roomiest exercise size for short cards', () => {
    expect(scaledExerciseFontRem(0)).toBe(2.6)
    expect(scaledExerciseFontRem(1)).toBe(2.6)
    expect(scaledExerciseFontRem(2)).toBe(2.6)
  })

  it('steps exercise text down monotonically as the tallest card grows', () => {
    const sizes = [2, 3, 4, 5, 8].map((n) => scaledExerciseFontRem(n))
    expect(sizes).toEqual([2.6, 2.4, 2.3, 2.2, 1.6])
    for (let i = 1; i < sizes.length; i += 1) {
      expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1])
    }
  })

  it('estimates effective rows taking long exercise line wrapping into account', () => {
    const columns = [
      ['Slider tucks', 'Dead bug', 'L sits'],
      [
        'Band bridge lat pull to chest',
        'Alternating dumbbell floor press',
        'Ab mat butterfly sit up',
      ],
    ]
    // 5 columns -> narrow cards, exercises with ~25+ chars wrap to multiple lines
    expect(estimateEffectiveRows(columns, 5)).toBeGreaterThan(3)
    expect(scaledExerciseFontRem(columns, 5)).toBeLessThan(2.6)
  })

  it('never returns an exercise size below the 1.4rem floor', () => {
    expect(scaledExerciseFontRem(100)).toBeGreaterThanOrEqual(1.4)
  })
})
