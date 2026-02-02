// File: tests/unit/lib/shared/hr-zones.test.ts
import { calculateHrZone } from '@/lib/shared/hr-zones'
import { HrZoneName } from '@/lib/shared/hr-zones'

describe('lib/shared/hr-zones', () => {
  describe('calculateHrZone', () => {
    it('should return NoData for HR <= 0', () => {
      const { zoneName } = calculateHrZone(0, 190)
      expect(zoneName).toBe(HrZoneName.NoData)
    })

    it('should return WarmUp for percentage < 60', () => {
      const { zoneName } = calculateHrZone(113, 190) // 59.47%
      expect(zoneName).toBe(HrZoneName.WarmUp)
    })

    it('should return FatBurn for 60 <= percentage < 70', () => {
      const { zoneName } = calculateHrZone(132, 190) // 69.47%
      expect(zoneName).toBe(HrZoneName.FatBurn)
    })

    it('should return Cardio for 70 <= percentage < 85', () => {
      const { zoneName } = calculateHrZone(160, 190) // 84.21%
      expect(zoneName).toBe(HrZoneName.Cardio)
    })

    it('should return Peak for 85 <= percentage < 95', () => {
      const { zoneName } = calculateHrZone(179, 190) // 94.21%
      expect(zoneName).toBe(HrZoneName.Peak)
    })

    it('should return Max for percentage >= 95', () => {
      const { zoneName } = calculateHrZone(181, 190) // 95.26%
      expect(zoneName).toBe(HrZoneName.Max)
    })
  })
})
