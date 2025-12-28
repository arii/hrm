/**
 * @jest-environment node
 */
import { calculateIntervalCalories } from '../../../services/calorieService'
import { HrmData } from '../../../lib/repositories/HrmDataRepository'
import { USER_AGE_DEFAULT, USER_WEIGHT_DEFAULT_KG } from '../../../utils/constants'

describe('services/calorieService', () => {
  describe('calculateIntervalCalories', () => {
    const mockClientData: HrmData = {
      clientId: 'test-client',
      value: 150,
      age: USER_AGE_DEFAULT,
      weightKg: USER_WEIGHT_DEFAULT_KG,
    }

    it('should return 0 if avgHr is below the threshold', () => {
      const calories = calculateIntervalCalories(
        29,
        Date.now() - 15000,
        mockClientData
      )
      expect(calories).toBe(0)
    })

    it('should return 0 if duration is negative', () => {
      const calories = calculateIntervalCalories(
        150,
        Date.now() + 15000,
        mockClientData
      )
      expect(calories).toBe(0)
    })

    it('should return 0 if duration is too long', () => {
      const calories = calculateIntervalCalories(
        150,
        Date.now() - 300001,
        mockClientData
      )
      expect(calories).toBe(0)
    })

    it('should calculate calories correctly for a valid interval', () => {
      const lastUpdate = Date.now() - 15000 // 15 seconds ago
      const calories = calculateIntervalCalories(150, lastUpdate, mockClientData)
      // Based on the Mifflin-St Jeor equation for a 30-year-old, 70kg male at 150bpm for 15s
      const expectedCalories = 3.56
      expect(calories).toBeCloseTo(expectedCalories, 2)
    })

    it('should use default age and weight if not provided', () => {
      const clientDataWithoutDefaults: HrmData = {
        clientId: 'test-client-2',
        value: 150,
      }
      const lastUpdate = Date.now() - 15000
      const calories = calculateIntervalCalories(
        150,
        lastUpdate,
        clientDataWithoutDefaults
      )
      const expectedCalories = 3.56
      expect(calories).toBeCloseTo(expectedCalories, 2)
    })
  })
})
