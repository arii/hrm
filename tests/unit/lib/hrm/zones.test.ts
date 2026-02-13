// File: tests/unit/lib/hrm/zones.test.ts
import { calculateHrZone } from '../../../../lib/hrm/zones'

describe('lib/hrm/zones', () => {
  describe('calculateHrZone', () => {
    const maxHr = 200

    it('should return "No Data" for invalid inputs', () => {
      expect(calculateHrZone(0, maxHr)).toEqual({
        zoneName: 'NO_DATA',
        percentage: 0,
        bpm: 0,
      })
      expect(calculateHrZone(100, 0)).toEqual({
        zoneName: 'NO_DATA',
        percentage: 0,
        bpm: 0,
      })
      expect(calculateHrZone(-1, maxHr)).toEqual({
        zoneName: 'NO_DATA',
        percentage: 0,
        bpm: 0,
      })
    })

    it('should correctly calculate the "Recovery" zone', () => {
      // 55% of 200 is 110
      const result = calculateHrZone(110, maxHr)
      expect(result.zoneName).toBe('ZONE_1')
      expect(result.percentage).toBe(55)
      expect(result.bpm).toBe(110)
    })

    it('should correctly calculate the "Warm Up" zone', () => {
      // 65% of 200 is 130
      const result = calculateHrZone(130, maxHr)
      expect(result.zoneName).toBe('ZONE_2')
      expect(result.percentage).toBe(65)
    })

    it('should correctly calculate the "Aerobic" zone', () => {
      // 75% of 200 is 150
      const result = calculateHrZone(150, maxHr)
      expect(result.zoneName).toBe('ZONE_3')
      expect(result.percentage).toBe(75)
    })

    it('should correctly calculate the "Threshold" zone', () => {
      // 85% of 200 is 170
      const result = calculateHrZone(170, maxHr)
      expect(result.zoneName).toBe('ZONE_4')
      expect(result.percentage).toBe(85)
    })

    it('should correctly calculate the "Maximum" zone', () => {
      // 95% of 200 is 190
      const result = calculateHrZone(190, maxHr)
      expect(result.zoneName).toBe('ZONE_6')
      expect(result.percentage).toBe(95)
    })

    it('should handle the exact lower boundary of a zone', () => {
      // 80% of 200 is 160, which is the start of Threshold (Zone 4)
      const result = calculateHrZone(160, maxHr)
      expect(result.zoneName).toBe('ZONE_4')
      expect(result.percentage).toBe(80)
    })

    it('should handle HR values exceeding the maximum', () => {
      const result = calculateHrZone(220, maxHr)
      expect(result.zoneName).toBe('ZONE_6')
      // Percentage should be capped at 100
      expect(result.percentage).toBe(100)
      expect(result.bpm).toBe(220)
    })
  })
})
