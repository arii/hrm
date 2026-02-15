import {
  calculateHeartRateZone,
  calculateMaxHr,
} from '../../../../lib/shared/hr-zones'

describe('lib/shared/hr-zones boundary conditions', () => {
  const age = 20
  const maxHr = calculateMaxHr(age) // 200

  it('should correctly handle boundary percentages', () => {
    // 90% -> ZONE_5
    expect(calculateHeartRateZone(180, maxHr).zoneName).toBe('ZONE_5')
    // 89% -> ZONE_4
    expect(calculateHeartRateZone(178, maxHr).zoneName).toBe('ZONE_4')

    // 80% -> ZONE_4
    expect(calculateHeartRateZone(160, maxHr).zoneName).toBe('ZONE_4')
    // 79% -> ZONE_3
    expect(calculateHeartRateZone(158, maxHr).zoneName).toBe('ZONE_3')

    // 70% -> ZONE_3
    expect(calculateHeartRateZone(140, maxHr).zoneName).toBe('ZONE_3')
    // 69% -> ZONE_2
    expect(calculateHeartRateZone(138, maxHr).zoneName).toBe('ZONE_2')

    // 60% -> ZONE_2
    expect(calculateHeartRateZone(120, maxHr).zoneName).toBe('ZONE_2')
    // 59% -> ZONE_1
    expect(calculateHeartRateZone(118, maxHr).zoneName).toBe('ZONE_1')

    // 50% -> ZONE_1
    expect(calculateHeartRateZone(100, maxHr).zoneName).toBe('ZONE_1')
    // 49% -> ZONE_0
    expect(calculateHeartRateZone(98, maxHr).zoneName).toBe('ZONE_0')
  })
})
