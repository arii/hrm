// tests/unit/lib/shared/hr-zones.boundary.test.ts
import {
  calculateZoneFromMaxHr,
  HrZoneName,
  MAX_HR_DEFAULT,
  calculateMaxHr,
} from '@/lib/shared/hr-zones'

describe('calculateZoneFromMaxHr Boundary Tests', () => {
  const maxHr = 200 // Easy math: 1% = 2 BPM

  it('identifies Resting zone (< 50%)', () => {
    // 49% = 98 BPM
    const result = calculateZoneFromMaxHr(98, maxHr)
    expect(result.zoneName).toBe(HrZoneName.Resting)
    expect(result.percentage).toBe(49)
  })

  it('identifies WarmUp boundary (50%)', () => {
    // 50% = 100 BPM
    const result = calculateZoneFromMaxHr(100, maxHr)
    expect(result.zoneName).toBe(HrZoneName.WarmUp)
    expect(result.percentage).toBe(50)
  })

  it('identifies FatBurn boundary (60%)', () => {
    // 60% = 120 BPM
    const result = calculateZoneFromMaxHr(120, maxHr)
    expect(result.zoneName).toBe(HrZoneName.FatBurn)
    expect(result.percentage).toBe(60)
  })

  it('identifies Cardio boundary (70%)', () => {
    // 70% = 140 BPM
    const result = calculateZoneFromMaxHr(140, maxHr)
    expect(result.zoneName).toBe(HrZoneName.Cardio)
    expect(result.percentage).toBe(70)
  })

  it('identifies Peak boundary (85%)', () => {
    // 85% = 170 BPM
    const result = calculateZoneFromMaxHr(170, maxHr)
    expect(result.zoneName).toBe(HrZoneName.Peak)
    expect(result.percentage).toBe(85)
  })

  it('identifies Max boundary (95%)', () => {
    // 95% = 190 BPM
    const result = calculateZoneFromMaxHr(190, maxHr)
    expect(result.zoneName).toBe(HrZoneName.Max)
    expect(result.percentage).toBe(95)
  })

  it('caps percentage at 100%', () => {
    const result = calculateZoneFromMaxHr(210, maxHr) // 105%
    expect(result.percentage).toBe(100)
    expect(result.zoneName).toBe(HrZoneName.Max)
  })

  it('handles zero or invalid inputs', () => {
    expect(calculateZoneFromMaxHr(0, maxHr).zoneName).toBe(HrZoneName.NoData)
    expect(calculateZoneFromMaxHr(100, 0).zoneName).toBe(HrZoneName.NoData)
    expect(calculateZoneFromMaxHr(-10, maxHr).zoneName).toBe(HrZoneName.NoData)
  })
})

describe('calculateMaxHr', () => {
  it('calculates correctly', () => {
    expect(calculateMaxHr(20)).toBe(208 - 0.7 * 20)
  })
  it('returns default if invalid', () => {
    expect(calculateMaxHr(0)).toBe(MAX_HR_DEFAULT)
    expect(calculateMaxHr(null)).toBe(MAX_HR_DEFAULT)
  })
})
