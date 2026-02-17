import {
  calculateZoneFromMaxHr,
  calculateMaxHr,
  MAX_HR_DEFAULT,
} from '../../../../lib/shared/hr-zones'

describe('lib/shared/hr-zones', () => {
  describe('calculateMaxHr', () => {
    it('should calculate max HR for a valid numeric age', () => {
      expect(calculateMaxHr(30)).toBe(190) // 220 - 30
      expect(calculateMaxHr(50)).toBe(170) // 220 - 50
    })

    it('should calculate max HR for a valid string age', () => {
      expect(calculateMaxHr('40')).toBe(180) // 220 - 40
    })

    it('should return MAX_HR_DEFAULT for undefined', () => {
      expect(calculateMaxHr(undefined)).toBe(MAX_HR_DEFAULT)
    })

    it('should return MAX_HR_DEFAULT for null', () => {
      expect(calculateMaxHr(null)).toBe(MAX_HR_DEFAULT)
    })

    it('should return MAX_HR_DEFAULT for non-positive or invalid numeric age', () => {
      expect(calculateMaxHr(0)).toBe(MAX_HR_DEFAULT)
      expect(calculateMaxHr(-5)).toBe(MAX_HR_DEFAULT)
    })

    it('should return MAX_HR_DEFAULT for invalid string age', () => {
      expect(calculateMaxHr('abc')).toBe(MAX_HR_DEFAULT)
      expect(calculateMaxHr('')).toBe(MAX_HR_DEFAULT)
    })
  })

  describe('calculateZoneFromMaxHr', () => {
    it('should calculate zone info using provided numeric age', () => {
      const age = 20 // Max HR = 200
      const maxHr = calculateMaxHr(age)
      // 150 bpm / 200 max = 75% -> Zone 3
      const result = calculateZoneFromMaxHr(150, maxHr)
      expect(result.percentage).toBe(75)
      expect(result.zone).toBe(3)
    })

    it('should calculate zone info using default max HR', () => {
      const maxHr = MAX_HR_DEFAULT // 185
      // 185 bpm / 185 max = 100% -> Zone 6 (since 100% >= 95%)
      const result = calculateZoneFromMaxHr(185, maxHr)
      expect(result.percentage).toBe(100)
      expect(result.zone).toBe(6)
    })

    it('should handle zero heart rate', () => {
      const maxHr = calculateMaxHr(30)
      const result = calculateZoneFromMaxHr(0, maxHr)
      expect(result.percentage).toBe(0)
      expect(result.zone).toBe(0)
    })

    it('should correctly identify Zone 6 (Max) for heart rate >= 95% of max', () => {
      const age = 20 // Max HR = 200
      const maxHr = calculateMaxHr(age)
      // 190 bpm / 200 max = 95% -> Zone 6
      const result95 = calculateZoneFromMaxHr(190, maxHr)
      expect(result95.percentage).toBe(95)
      expect(result95.zone).toBe(6)

      // 196 bpm / 200 max = 98% -> Zone 6
      const result98 = calculateZoneFromMaxHr(196, maxHr)
      expect(result98.percentage).toBe(98)
      expect(result98.zone).toBe(6)
    })
  })
})
