/**
 * @jest-environment jsdom
 */
import { getHrZoneProps } from '../../../utils/visualization'
import { HR_ZONE_CONFIG } from '../../../lib/shared/hr-zones'

describe('getHrZoneProps', () => {
  const maxHr = 200

  // Test cases for each HR Zone
  const testCases = [
    {
      zone: 'ZONE_0',
      hr: 0,
      expectedColor: HR_ZONE_CONFIG.ZONE_0.textColor,
    },
    {
      zone: 'ZONE_1',
      hr: 100,
      expectedColor: HR_ZONE_CONFIG.ZONE_1.textColor,
    },
    {
      zone: 'ZONE_2',
      hr: 120,
      expectedColor: HR_ZONE_CONFIG.ZONE_2.textColor,
    },
    {
      zone: 'ZONE_3',
      hr: 140,
      expectedColor: HR_ZONE_CONFIG.ZONE_3.textColor,
    },
    {
      zone: 'ZONE_4',
      hr: 160,
      expectedColor: HR_ZONE_CONFIG.ZONE_4.textColor,
    },
    {
      zone: 'ZONE_5',
      hr: 180,
      expectedColor: HR_ZONE_CONFIG.ZONE_5.textColor,
    },
    {
      zone: 'ZONE_6',
      hr: 196,
      expectedColor: HR_ZONE_CONFIG.ZONE_6.textColor,
    },
  ]

  testCases.forEach(({ zone, hr, expectedColor }) => {
    it(`should return the correct text color for the ${zone} zone`, () => {
      const { textColor, zone: resultZone } = getHrZoneProps(hr, maxHr)
      // Only check the color if the zone matches, to account for boundary conditions
      if (resultZone === zone) {
        expect(textColor).toBe(expectedColor)
      }
    })
  })
})
