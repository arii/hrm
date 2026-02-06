import { createTheme } from '@mui/material/styles'
import { getZoneColor } from '@/utils/themeUtils'
import { HrZoneName } from '@/lib/shared/hr-zones'

describe('getZoneColor', () => {
  const theme = createTheme({
    palette: {
      custom: {
        hrZones: {
          warmUp: '#blue',
          fatBurn: '#green',
          cardio: '#yellow',
          peak: '#red',
          max: '#darkred',
          unknown: '#grey',
          noData: '#lightgrey',
        },
      },
    },
  })

  it('returns the correct color for each zone', () => {
    expect(getZoneColor(HrZoneName.Max, theme)).toBe('#darkred')
    expect(getZoneColor(HrZoneName.Peak, theme)).toBe('#red')
    expect(getZoneColor(HrZoneName.Cardio, theme)).toBe('#yellow')
    expect(getZoneColor(HrZoneName.FatBurn, theme)).toBe('#green')
    expect(getZoneColor(HrZoneName.WarmUp, theme)).toBe('#blue')
    expect(getZoneColor(HrZoneName.Unknown, theme)).toBe('#grey')
    expect(getZoneColor(HrZoneName.NoData, theme)).toBe('#lightgrey')
  })

  it('returns grey fallback if theme palette is missing', () => {
    const brokenTheme = createTheme({})
    expect(getZoneColor(HrZoneName.Peak, brokenTheme)).toBe(
      brokenTheme.palette.grey[500]
    )
  })

  it('returns grey fallback for invalid zone', () => {
    // @ts-expect-error Testing runtime fallback for invalid enum
    expect(getZoneColor('InvalidZone', theme)).toBe(theme.palette.grey[500])
  })
})
