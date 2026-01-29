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

    // Max HR = 185 (default)
    expect(zones.warmUp.min).toBe(93) // 185 * 0.5 = 92.5, rounded
    expect(zones.fatBurn.min).toBe(111) // 185 * 0.6
    expect(zones.cardio.min).toBe(130) // 185 * 0.7 = 129.5, rounded
    expect(zones.peak.min).toBe(157) // 185 * 0.85 = 157.25, rounded
    expect(zones.max.min).toBe(176) // 185 * 0.95 = 175.75, rounded
  })
})
