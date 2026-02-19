import {
  calculateZoneFromMaxHr,
  toHeartRateZone,
  calculateMaxHr,
  MAX_HR_DEFAULT,
} from '@/lib/shared/hr-zones'

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
      const age = 20
      const maxHr = calculateMaxHr(age) // 200
      // 150 bpm / 200 max = 75% -> ZONE_3
      const { percentage, zone } = calculateZoneFromMaxHr(150, maxHr)
      expect(percentage).toBe(75)
      expect(toHeartRateZone(zone)).toBe('ZONE_3')
    })

    it('should calculate zone info using provided string age', () => {
      const age = '20'
      const maxHr = calculateMaxHr(age) // 200
      // 100 bpm / 200 max = 50% -> ZONE_1
      const { percentage, zone } = calculateZoneFromMaxHr(100, maxHr)
      expect(percentage).toBe(50)
      expect(toHeartRateZone(zone)).toBe('ZONE_1')
    })

    it('should calculate zone info using default max HR when age is undefined', () => {
      const maxHr = calculateMaxHr(undefined) // 185
      // 185 bpm / 185 max = 100% -> ZONE_6
      const { percentage, zone } = calculateZoneFromMaxHr(185, maxHr)
      expect(percentage).toBe(100)
      expect(toHeartRateZone(zone)).toBe('ZONE_6')
    })

    it('should calculate zone info using default max HR when age is null', () => {
      const maxHr = calculateMaxHr(null) // 185
      // 93 bpm / 185 max = 50.2% -> ZONE_1
      const { zone } = calculateZoneFromMaxHr(93, maxHr)
      expect(toHeartRateZone(zone)).toBe('ZONE_1')
    })

    it('should handle zero heart rate', () => {
      const maxHr = calculateMaxHr(30)
      const { percentage, zone } = calculateZoneFromMaxHr(0, maxHr)
      expect(percentage).toBe(0)
      expect(toHeartRateZone(zone)).toBe('ZONE_0')
    })

    it('should correctly identify Zone 6 (Max) for heart rate >= 95% of max', () => {
      const age = 20
      const maxHr = calculateMaxHr(age) // 200
      // 190 bpm / 200 max = 95% -> ZONE_6
      const { percentage, zone } = calculateZoneFromMaxHr(190, maxHr)
      expect(percentage).toBe(95)
      expect(toHeartRateZone(zone)).toBe('ZONE_6')

      // 196 bpm / 200 max = 98% -> ZONE_6
      const result98 = calculateZoneFromMaxHr(196, maxHr)
      expect(result98.percentage).toBe(98)
      expect(toHeartRateZone(result98.zone)).toBe('ZONE_6')
    })
  })
})
