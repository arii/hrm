import { calculateHrZoneInfo } from '../../../../lib/shared/hr-zones'

describe('lib/shared/hr-zones boundary conditions', () => {
  const age = 20 // Max HR = 200

  it('should correctly handle boundary percentages', () => {
    const config = { method: 'MAX_HR' as const, age }
    // 90% -> Zone 5
    expect(calculateHrZoneInfo(180, config).zone).toBe(5)
    // 89% -> Zone 4
    expect(calculateHrZoneInfo(178, config).zone).toBe(4)

    // 80% -> Zone 4
    expect(calculateHrZoneInfo(160, config).zone).toBe(4)
    // 79% -> Zone 3
    expect(calculateHrZoneInfo(158, config).zone).toBe(3)

    // 70% -> Zone 3
    expect(calculateHrZoneInfo(140, config).zone).toBe(3)
    // 69% -> Zone 2
    expect(calculateHrZoneInfo(138, config).zone).toBe(2)

    // 60% -> Zone 2
    expect(calculateHrZoneInfo(120, config).zone).toBe(2)
    // 59% -> Zone 1
    expect(calculateHrZoneInfo(118, config).zone).toBe(1)

    // 50% -> Zone 1
    expect(calculateHrZoneInfo(100, config).zone).toBe(1)
    // 49% -> Zone 0
    expect(calculateHrZoneInfo(98, config).zone).toBe(0)
  })
})
