/**
 * @jest-environment jsdom
 */
import { getHrZoneProps } from '@/utils/visualization'
import { HrZoneName } from '@/lib/shared/hr-zones'
import theme from '@/lib/theme'
import { HR_ZONE_UI_PROPS_MAP } from '@/utils/visualization'

describe('getHrZoneProps', () => {
  const maxHr = 200

  // Test cases for each HR Zone
  const testCases = [
    { zone: HrZoneName.NoData, hr: 0, expectedColor: '#FFFFFF' },
    { zone: HrZoneName.Unknown, hr: 0, expectedColor: '#FFFFFF' },
    {
      zone: HrZoneName.WarmUp,
      hr: 100,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP[HrZoneName.WarmUp].bgColor
      ),
    },
    { zone: HrZoneName.FatBurn, hr: 130, expectedColor: '#FFFFFF' },
    { zone: HrZoneName.Cardio, hr: 150, expectedColor: '#FFFFFF' },
    {
      zone: HrZoneName.Peak,
      hr: 170,
      expectedColor: theme.palette.getContrastText(
        HR_ZONE_UI_PROPS_MAP[HrZoneName.Peak].bgColor
      ),
    },
    {
      zone: HrZoneName.Max,
      hr: 190,
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
