// tests/unit/utils/hr-zones.test.ts
import { getUserHrZones } from '@/utils/hr-zones'

describe('getUserHrZones', () => {
  it('should calculate HR zones correctly for a given age', () => {
    const age = 30
    const zones = getUserHrZones(age)

    // Max HR = 220 - 30 = 190
    expect(zones.warmUp.min).toBe(95) // 190 * 0.5
    expect(zones.fatBurn.min).toBe(114) // 190 * 0.6
    expect(zones.cardio.min).toBe(133) // 190 * 0.7
    expect(zones.peak.min).toBe(162) // 190 * 0.85 = 161.5, rounded to 162
    expect(zones.max.min).toBe(181) // 190 * 0.95 = 180.5, rounded to 181
  })

  it('should handle age 0 gracefully', () => {
    const age = 0
    const zones = getUserHrZones(age)

    // Max HR = 200
    expect(zones.warmUp.min).toBe(100)
    expect(zones.fatBurn.min).toBe(120)
    expect(zones.cardio.min).toBe(140)
    expect(zones.peak.min).toBe(170)
    expect(zones.max.min).toBe(190)
  })
})
