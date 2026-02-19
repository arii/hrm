import {
  calculateZoneFromMaxHr,
  toHeartRateZone,
<<<<<<< HEAD
} from '@/lib/shared/hr-zones'
=======
} from '../../../../lib/shared/hr-zones'
import { calculateMaxHr } from '@/utils/hrCalculations'
>>>>>>> origin/leader

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
  })
})
