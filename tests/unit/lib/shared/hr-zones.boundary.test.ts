import {
  calculateZoneFromMaxHr,
  calculateMaxHr,
} from '../../../../lib/shared/hr-zones'

describe('lib/shared/hr-zones boundary conditions', () => {
  const age = 20 // Max HR = 200
  const maxHr = calculateMaxHr(age)

  it('should correctly handle boundary percentages', () => {
    // 90% -> Zone 5
    expect(calculateZoneFromMaxHr(180, maxHr).zone).toBe(5)
    // 89% -> Zone 4
    expect(calculateZoneFromMaxHr(178, maxHr).zone).toBe(4)

    // 80% -> Zone 4
    expect(calculateZoneFromMaxHr(160, maxHr).zone).toBe(4)
    // 79% -> Zone 3
    expect(calculateZoneFromMaxHr(158, maxHr).zone).toBe(3)

    // 70% -> Zone 3
    expect(calculateZoneFromMaxHr(140, maxHr).zone).toBe(3)
    // 69% -> Zone 2
    expect(calculateZoneFromMaxHr(138, maxHr).zone).toBe(2)

    // 60% -> Zone 2
    expect(calculateZoneFromMaxHr(120, maxHr).zone).toBe(2)
    // 59% -> Zone 1
    expect(calculateZoneFromMaxHr(118, maxHr).zone).toBe(1)

    // 50% -> Zone 1
    expect(calculateZoneFromMaxHr(100, maxHr).zone).toBe(1)
    // 49% -> Zone 0
    expect(calculateZoneFromMaxHr(98, maxHr).zone).toBe(0)
  })
})
