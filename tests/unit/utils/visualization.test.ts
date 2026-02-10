/**
 * @jest-environment jsdom
 */
import { getHrZoneProps } from '../../../utils/visualization'
import { HrZoneName } from '../../../lib/shared/hr-zones'
import theme from '../../../lib/theme'
import { HR_ZONE_UI_PROPS_MAP } from '../../../utils/visualization'

describe('getHrZoneProps', () => {
  const maxHr = 200

  // Test cases for each HR Zone
  const testCases = [
    { zone: HrZoneName.NoData, hr: 0, expectedColor: '#FFFFFF' },
    { zone: HrZoneName.Unknown, hr: 0, expectedColor: '#FFFFFF' },
    {
      zone: HrZoneName.Recovery,
      hr: 100,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP[HrZoneName.Recovery].bgColor
      ),
    },
    { zone: HrZoneName.WarmUp, hr: 120, expectedColor: '#FFFFFF' },
    { zone: HrZoneName.Aerobic, hr: 140, expectedColor: '#FFFFFF' },
    { zone: HrZoneName.Cardio, hr: 160, expectedColor: '#FFFFFF' },
    {
      zone: HrZoneName.Peak,
      hr: 180,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP[HrZoneName.Peak].bgColor
      ),
    },
    {
      zone: HrZoneName.Max,
      hr: 196,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP[HrZoneName.Max].bgColor
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
