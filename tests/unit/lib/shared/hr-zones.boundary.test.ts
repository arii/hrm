import {
  calculateZoneFromMaxHr,
  calculateMaxHr,
<<<<<<< HEAD
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
=======
  toHeartRateZone,
} from '../../../../lib/shared/hr-zones'

describe('lib/shared/hr-zones boundary conditions', () => {
  const age = 20
  const maxHr = calculateMaxHr(age) // 200

  it('should correctly handle boundary percentages', () => {
    // 90% -> ZONE_5
    expect(toHeartRateZone(calculateZoneFromMaxHr(180, maxHr).zone)).toBe(
      'ZONE_5'
    )
    // 89% -> ZONE_4
    expect(toHeartRateZone(calculateZoneFromMaxHr(178, maxHr).zone)).toBe(
      'ZONE_4'
    )

    // 80% -> ZONE_4
    expect(toHeartRateZone(calculateZoneFromMaxHr(160, maxHr).zone)).toBe(
      'ZONE_4'
    )
    // 79% -> ZONE_3
    expect(toHeartRateZone(calculateZoneFromMaxHr(158, maxHr).zone)).toBe(
      'ZONE_3'
    )

    // 70% -> ZONE_3
    expect(toHeartRateZone(calculateZoneFromMaxHr(140, maxHr).zone)).toBe(
      'ZONE_3'
    )
    // 69% -> ZONE_2
    expect(toHeartRateZone(calculateZoneFromMaxHr(138, maxHr).zone)).toBe(
      'ZONE_2'
    )

    // 60% -> ZONE_2
    expect(toHeartRateZone(calculateZoneFromMaxHr(120, maxHr).zone)).toBe(
      'ZONE_2'
    )
    // 59% -> ZONE_1
    expect(toHeartRateZone(calculateZoneFromMaxHr(118, maxHr).zone)).toBe(
      'ZONE_1'
    )

    // 50% -> ZONE_1
    expect(toHeartRateZone(calculateZoneFromMaxHr(100, maxHr).zone)).toBe(
      'ZONE_1'
    )
    // 49% -> ZONE_0
    expect(toHeartRateZone(calculateZoneFromMaxHr(98, maxHr).zone)).toBe(
      'ZONE_0'
    )
>>>>>>> origin/leader
  })
})
