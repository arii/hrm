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

    it('should correctly calculate the "Recovery" zone', () => {
      // 55% of 200 is 110
      const result = calculateHrZone(110, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Recovery)
      expect(result.percentage).toBe(55)
      expect(result.bpm).toBe(110)
    })

    it('should correctly calculate the "Warm Up" zone', () => {
      // 65% of 200 is 130
      const result = calculateHrZone(130, maxHr)
      expect(result.zoneName).toBe(HrZoneName.WarmUp)
      expect(result.percentage).toBe(65)
    })

    it('should correctly calculate the "Fat Burn" zone', () => {
      // 75% of 200 is 150
      const result = calculateHrZone(150, maxHr)
      expect(result.zoneName).toBe(HrZoneName.FatBurn)
      expect(result.percentage).toBe(75)
    })

    it('should correctly calculate the "Cardio" zone', () => {
      // 85% of 200 is 170
      const result = calculateHrZone(170, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(85)
    })

    it('should correctly calculate the "Max" zone', () => {
      // 95% of 200 is 190
      const result = calculateHrZone(190, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Max)
      expect(result.percentage).toBe(95)
    })

    it('should handle the exact lower boundary of a zone', () => {
      // 80% of 200 is 160, which is the start of Cardio
      const result = calculateHrZone(160, maxHr)
      expect(result.zoneName).toBe(HrZoneName.Cardio)
      expect(result.percentage).toBe(80)
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
