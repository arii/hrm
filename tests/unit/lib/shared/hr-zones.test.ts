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

    // Edge Cases using MaxHR = 100 for easy percentage calculation
    describe('Boundary Conditions', () => {
      const MAX_HR = 100

      it('should classify 59% as WarmUp', () => {
        expect(calculateHrZone(59, MAX_HR).zoneName).toBe(HrZoneName.WarmUp)
      })

      it('should classify 60% as FatBurn', () => {
        expect(calculateHrZone(60, MAX_HR).zoneName).toBe(HrZoneName.FatBurn)
      })

      it('should classify 69% as FatBurn', () => {
        expect(calculateHrZone(69, MAX_HR).zoneName).toBe(HrZoneName.FatBurn)
      })

      it('should classify 70% as Cardio', () => {
        expect(calculateHrZone(70, MAX_HR).zoneName).toBe(HrZoneName.Cardio)
      })

      it('should classify 84% as Cardio', () => {
        expect(calculateHrZone(84, MAX_HR).zoneName).toBe(HrZoneName.Cardio)
      })

      it('should classify 85% as Peak', () => {
        expect(calculateHrZone(85, MAX_HR).zoneName).toBe(HrZoneName.Peak)
      })

      it('should classify 94% as Peak', () => {
        expect(calculateHrZone(94, MAX_HR).zoneName).toBe(HrZoneName.Peak)
      })

      it('should classify 95% as Max', () => {
        expect(calculateHrZone(95, MAX_HR).zoneName).toBe(HrZoneName.Max)
      })
    })
  })
})
