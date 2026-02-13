import { calculateHrZoneInfo } from '../../../../lib/shared/hr-zones'

describe('lib/shared/hr-zones boundary conditions', () => {
  const age = 20 // Max HR = 200

  it('should correctly handle boundary percentages', () => {
    // 90% -> Zone 5
    expect(calculateHrZoneInfo(180, age).zone).toBe('ZONE_5')
    // 89% -> Zone 4
    expect(calculateHrZoneInfo(178, age).zone).toBe('ZONE_4')

    // 80% -> Zone 4
    expect(calculateHrZoneInfo(160, age).zone).toBe('ZONE_4')
    // 79% -> Zone 3
    expect(calculateHrZoneInfo(158, age).zone).toBe('ZONE_3')

    // 70% -> Zone 3
    expect(calculateHrZoneInfo(140, age).zone).toBe('ZONE_3')
    // 69% -> Zone 2
    expect(calculateHrZoneInfo(138, age).zone).toBe('ZONE_2')

    // 60% -> Zone 2
    expect(calculateHrZoneInfo(120, age).zone).toBe('ZONE_2')
    // 59% -> Zone 1
    expect(calculateHrZoneInfo(118, age).zone).toBe('ZONE_1')

    // 50% -> Zone 1
    expect(calculateHrZoneInfo(100, age).zone).toBe('ZONE_1')
    // 49% -> Zone 0
    expect(calculateHrZoneInfo(98, age).zone).toBe('ZONE_0')
  })
})
