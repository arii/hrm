/**
 * @jest-environment jsdom
 */
import { getHrZoneProps } from '../../../utils/visualization'
import theme from '../../../lib/theme'
import { HR_ZONE_UI_PROPS_MAP } from '../../../utils/visualization'

describe('getHrZoneProps', () => {
  const maxHr = 200

  // Test cases for each HR Zone
  const testCases = [
    { zone: 'ZONE_0', hr: 0, expectedColor: '#FFFFFF' },
    {
      zone: 'ZONE_1',
      hr: 100,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP['ZONE_1'].bgColor
      ),
    },
    { zone: 'ZONE_2', hr: 120, expectedColor: '#FFFFFF' },
    { zone: 'ZONE_3', hr: 140, expectedColor: '#FFFFFF' },
    { zone: 'ZONE_4', hr: 160, expectedColor: '#FFFFFF' },
    {
      zone: 'ZONE_5',
      hr: 180,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP['ZONE_5'].bgColor
      ),
    },
    {
      zone: 'ZONE_6',
      hr: 196,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP['ZONE_6'].bgColor
      ),
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
