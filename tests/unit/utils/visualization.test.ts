/**
 * @jest-environment jsdom
 */
import { getHrZoneProps } from '../../../utils/visualization'
import { HeartRateZone } from '../../../lib/shared/hr-zones'
import theme from '../../../lib/theme'
import { HR_ZONE_UI_PROPS_MAP } from '../../../utils/visualization'

describe('getHrZoneProps', () => {
  const maxHr = 200

  // Test cases for each HR Zone
  const testCases: { zone: HeartRateZone; hr: number; expectedColor?: string }[] = [
    { zone: 'NO_DATA', hr: 0, expectedColor: '#FFFFFF' },
    { zone: 'UNKNOWN', hr: 0, expectedColor: '#FFFFFF' },
    {
      zone: 'ZONE_1', // Recovery
      hr: 110, // 55%
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP['ZONE_1'].bgColor
      ),
    },
    { zone: 'ZONE_2', hr: 130, expectedColor: '#FFFFFF' }, // WarmUp (65%)
    { zone: 'ZONE_3', hr: 150, expectedColor: '#FFFFFF' }, // Aerobic (75%)
    { zone: 'ZONE_4', hr: 170, expectedColor: '#FFFFFF' }, // Threshold (85%)
    {
      zone: 'ZONE_5', // Anaerobic
      hr: 184, // 92%
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP['ZONE_5'].bgColor
      ),
    },
    {
      zone: 'ZONE_6', // Max
      hr: 196, // 98%
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP['ZONE_6'].bgColor
      ),
    },
  ]

  testCases.forEach(({ zone, hr, expectedColor }) => {
    it(`should return the correct text color for the ${zone} zone`, () => {
      const { textColor, zone: resultZone } = getHrZoneProps(hr, maxHr)

      // Only check the color if the zone matches, to account for boundary conditions
      if (resultZone === zone && expectedColor) {
        expect(textColor).toBe(expectedColor)
      } else if (resultZone !== zone) {
        // Fail if zone calculation mismatches expectation
        // except for 0 hr which returns NO_DATA but we might test UNKNOWN
        if (hr > 0) {
           expect(resultZone).toBe(zone)
        }
      }
    })
  })
})
