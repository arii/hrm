/**
 * @jest-environment node
 */
import { calculateCalories } from '../../../utils/constants'

describe('calculateCalories', () => {
  it('should calculate calories correctly for metric units', () => {
    const calories = calculateCalories(150, 30, 75, 'metric')
    expect(calories).toBeCloseTo(14.45, 1)
  })

  it('should calculate calories correctly for imperial units', () => {
    const calories = calculateCalories(150, 30, 165, 'imperial')
    expect(calories).toBeCloseTo(14.45, 1)
  })
})
