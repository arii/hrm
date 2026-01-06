// File: tests/unit/lib/hrm/zones.test.ts
import { calculateHrZone } from '../../../../lib/hrm/zones'
import { HrZoneName } from '../../../../lib/shared/hr-zones'

describe('lib/hrm/zones', () => {
  describe('calculateHrZone', () => {
    const maxHr = 200

    it('should return "No Data" for invalid inputs', () => {
      expect(calculateHrZone(0, maxHr)).toEqual({
        zoneName: HrZoneName.NoData,
        percentage: 0,
        bpm: 0,
      })
      expect(calculateHrZone(100, 0)).toEqual({
        zoneName: HrZoneName.NoData,
        percentage: 0,
        bpm: 0,
      })
      expect(calculateHrZone(-1, maxHr)).toEqual({
        zoneName: HrZoneName.NoData,
        percentage: 0,
        bpm: 0,
      })
    })

    it('should correctly calculate the "Warm-up" zone', () => {
      // 55% of 200 is 110
      const result = calculateHrZone(110, maxHr)
      expect(result.zoneName).toBe(HrZoneName.WarmUp)
      expect(result.percentage).toBe(55)
      expect(result.bpm).toBe(110)
    })

    it('should correctly calculate the "Fat Burn" zone', () => {
      // 65% of 200 is 130
      const result = calculateHrZone(130, maxHr)
      expect(result.zoneName).toBe(HrZoneName.FatBurn)
      expect(result.percentage).toBe(65)
    })

    it('should correctly calculate the "Cardio" zone', () => {
      // 75% of 200 is 150
      const result = calculateHrZone(150, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(75)
    })

    it('should correctly calculate the "Peak" zone', () => {
      // 90% of 200 is 180
      const result = calculateHrZone(180, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Peak)
      expect(result.percentage).toBe(90)
    })

    it('should correctly calculate the "Max" zone', () => {
      // 98% of 200 is 196
      const result = calculateHrZone(196, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Max)
      expect(result.percentage).toBe(98)
    })

    it('should handle the exact lower boundary of a zone', () => {
      // 70% of 200 is 140, which is the start of Cardio
      const result = calculateHrZone(140, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(70)
    })

    it('should handle HR values exceeding the maximum', () => {
      const result = calculateHrZone(220, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Max)
      // Percentage should be capped at 100
      expect(result.percentage).toBe(100)
      expect(result.bpm).toBe(220)
    })
  })
})
