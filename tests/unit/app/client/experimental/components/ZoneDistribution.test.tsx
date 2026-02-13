/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme/theme'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HeartRateZone, HR_ZONE_CONFIG } from '@/lib/shared/hr-zones'

// Mock recharts components
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Pie: () => <div />,
  Cell: () => <div />,
  Tooltip: () => <div />,
}))

describe('ZoneDistribution', () => {
  const baseTimeInZones: Record<HeartRateZone, number> = {
    ZONE_0: 0,
    ZONE_1: 0,
    ZONE_2: 0,
    ZONE_3: 0,
    ZONE_4: 0,
    ZONE_5: 0,
    ZONE_6: 0,
    NO_DATA: 0,
    UNKNOWN: 0,
  }

  it('renders the title', () => {
    const timeInZones = { ...baseTimeInZones, ZONE_4: 1 }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={1} />
      </ThemeProvider>
    )
    expect(screen.getByText('Heart Rate Zone Distribution')).toBeInTheDocument()
  })

  it('renders the chart region with correct accessibility labels', () => {
    const timeInZones = { ...baseTimeInZones, ZONE_4: 1 }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={1} />
      </ThemeProvider>
    )
    const region = screen.getByRole('region', {
      name: /heart rate zone distribution chart/i,
    })
    expect(region).toBeInTheDocument()
  })

  it('returns null when there is no data to display', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={0} />
      </ThemeProvider>
    )
    expect(container.firstChild).toBeNull()
  })

  it('calculates and displays the time and percentage for each zone', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_1: 60, // Warm Up
      ZONE_3: 30, // Aerobic
      ZONE_4: 10, // Threshold
    }
    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={100} />
      </ThemeProvider>
    )

    const warmUpRow = getByTestId(`zone-row-${HR_ZONE_CONFIG.ZONE_1.label}`)
    expect(within(warmUpRow).getByText('01:00')).toBeInTheDocument()
    expect(within(warmUpRow).getByText(/60%/)).toBeInTheDocument()

    const aerobicRow = getByTestId(`zone-row-${HR_ZONE_CONFIG.ZONE_3.label}`)
    expect(within(aerobicRow).getByText('00:30')).toBeInTheDocument()
    expect(within(aerobicRow).getByText(/30%/)).toBeInTheDocument()

    const thresholdRow = getByTestId(`zone-row-${HR_ZONE_CONFIG.ZONE_4.label}`)
    expect(within(thresholdRow).getByText('00:10')).toBeInTheDocument()
    expect(within(thresholdRow).getByText(/10%/)).toBeInTheDocument()
  })

  it('does not display zones with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_1: 100,
    }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={100} />
      </ThemeProvider>
    )
    expect(screen.getByText(HR_ZONE_CONFIG.ZONE_1.label)).toBeInTheDocument()
    expect(
      screen.queryByText(HR_ZONE_CONFIG.ZONE_3.label)
    ).not.toBeInTheDocument()
  })

  it('includes NoData and Unknown zones to reflect data gaps', () => {
    const timeInZones = {
      ...baseTimeInZones,
      NO_DATA: 50,
      UNKNOWN: 50,
      ZONE_4: 10,
    }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={110} />
      </ThemeProvider>
    )
    expect(screen.getByText(HR_ZONE_CONFIG.NO_DATA.label)).toBeInTheDocument()
    expect(screen.getByText(HR_ZONE_CONFIG.UNKNOWN.label)).toBeInTheDocument()
    expect(screen.getByText(HR_ZONE_CONFIG.ZONE_4.label)).toBeInTheDocument()
  })

  it('handles a total duration of zero to prevent division by zero', () => {
    const timeInZones = { ...baseTimeInZones, ZONE_4: 120 }
    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={0} />
      </ThemeProvider>
    )
    const thresholdRow = getByTestId(`zone-row-${HR_ZONE_CONFIG.ZONE_4.label}`)
    expect(within(thresholdRow).getByText('02:00')).toBeInTheDocument()
    expect(within(thresholdRow).getByText(/0%/)).toBeInTheDocument()
  })

  it('uses correct colors for each zone from the config', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_1: 10,
      ZONE_3: 10,
      ZONE_4: 10,
      ZONE_5: 10,
      ZONE_6: 10,
      NO_DATA: 10,
      UNKNOWN: 10,
    }
    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={70} />
      </ThemeProvider>
    )

    const checkColor = (zone: HeartRateZone) => {
      const row = getByTestId(`zone-row-${HR_ZONE_CONFIG[zone].label}`)
      expect(within(row).getByTestId('zone-color-indicator')).toHaveStyle(
        `background-color: ${HR_ZONE_CONFIG[zone].color}`
      )
    }

    checkColor('ZONE_1')
    checkColor('ZONE_3')
    checkColor('ZONE_4')
    checkColor('ZONE_5')
    checkColor('ZONE_6')
  })

  it('sorts zones from high intensity to low intensity', () => {
    const timeInZones: Record<HeartRateZone, number> = {
      ...baseTimeInZones,
      ZONE_1: 10, // Low
      ZONE_6: 10, // High
      ZONE_3: 10, // Mid
      ZONE_5: 10, // High-ish
      ZONE_4: 10, // Mid-high
      NO_DATA: 10,
      UNKNOWN: 10,
    }
    const { getAllByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={70} />
      </ThemeProvider>
    )

    const rows = getAllByTestId(/^zone-row-/)
    const renderedZones = rows.map((row) => row.getAttribute('data-testid'))

    // Expect order: Max (6) -> Anaerobic (5) -> Threshold (4) -> Aerobic (3) -> Easy (2 - absent) -> WarmUp (1) -> Idle (0) -> NoData -> Unknown
    expect(renderedZones).toEqual([
      `zone-row-${HR_ZONE_CONFIG.ZONE_6.label}`,
      `zone-row-${HR_ZONE_CONFIG.ZONE_5.label}`,
      `zone-row-${HR_ZONE_CONFIG.ZONE_4.label}`,
      `zone-row-${HR_ZONE_CONFIG.ZONE_3.label}`,
      `zone-row-${HR_ZONE_CONFIG.ZONE_1.label}`,
      `zone-row-${HR_ZONE_CONFIG.NO_DATA.label}`,
      `zone-row-${HR_ZONE_CONFIG.UNKNOWN.label}`,
    ])
  })
})
