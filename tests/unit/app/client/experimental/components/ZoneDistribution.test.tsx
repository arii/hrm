/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme/theme'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { HEART_RATE_ZONES } from '@/utils/constants'

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
  const baseTimeInZones: Record<HrZoneName, number> = {
    [HrZoneName.Idle]: 0,
    [HrZoneName.Recovery]: 0,
    [HrZoneName.WarmUp]: 0,
    [HrZoneName.Aerobic]: 0,
    [HrZoneName.Cardio]: 0,
    [HrZoneName.Peak]: 0,
    [HrZoneName.FatBurn]: 0,
    [HrZoneName.Max]: 0,
    [HrZoneName.NoData]: 0,
    [HrZoneName.Unknown]: 0,
  }

  it('renders the title', () => {
    const timeInZones = { ...baseTimeInZones, [HrZoneName.Cardio]: 1 }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={1} />
      </ThemeProvider>
    )
    expect(screen.getByText('Heart Rate Zone Distribution')).toBeInTheDocument()
  })

  it('renders the chart region with correct accessibility labels', () => {
    const timeInZones = { ...baseTimeInZones, [HrZoneName.Cardio]: 1 }
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
      [HrZoneName.WarmUp]: 60,
      [HrZoneName.FatBurn]: 30,
      [HrZoneName.Cardio]: 10,
    }
    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={100} />
      </ThemeProvider>
    )

    const warmUpRow = getByTestId(`zone-row-${HrZoneName.WarmUp}`)
    expect(within(warmUpRow).getByText('1:00')).toBeInTheDocument()
    expect(within(warmUpRow).getByText(/60%/)).toBeInTheDocument()

    const fatBurnRow = getByTestId(`zone-row-${HrZoneName.FatBurn}`)
    expect(within(fatBurnRow).getByText('0:30')).toBeInTheDocument()
    expect(within(fatBurnRow).getByText(/30%/)).toBeInTheDocument()

    const cardioRow = getByTestId(`zone-row-${HrZoneName.Cardio}`)
    expect(within(cardioRow).getByText('0:10')).toBeInTheDocument()
    expect(within(cardioRow).getByText(/10%/)).toBeInTheDocument()
  })

  it('does not display zones with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.WarmUp]: 100,
    }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={100} />
      </ThemeProvider>
    )
    expect(screen.getByText(HrZoneName.WarmUp)).toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.FatBurn)).not.toBeInTheDocument()
  })

  it('excludes NoData and Unknown zones even if they have time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.NoData]: 50,
      [HrZoneName.Unknown]: 50,
      [HrZoneName.Cardio]: 10,
    }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={110} />
      </ThemeProvider>
    )
    expect(screen.queryByText(HrZoneName.NoData)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Unknown)).not.toBeInTheDocument()
    expect(screen.getByText(HrZoneName.Cardio)).toBeInTheDocument()
  })

  it('handles a total duration of zero to prevent division by zero', () => {
    const timeInZones = { ...baseTimeInZones, [HrZoneName.Cardio]: 120 }
    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={0} />
      </ThemeProvider>
    )
    const cardioRow = getByTestId(`zone-row-${HrZoneName.Cardio}`)
    expect(within(cardioRow).getByText('2:00')).toBeInTheDocument()
    expect(within(cardioRow).getByText(/0%/)).toBeInTheDocument()
  })

  it('uses correct colors for each zone', () => {
    const timeInZones = {
      [HrZoneName.WarmUp]: 10,
      [HrZoneName.FatBurn]: 10,
      [HrZoneName.Cardio]: 10,
      [HrZoneName.Peak]: 10,
      [HrZoneName.Max]: 10,
    } as unknown as Record<HrZoneName, number>

    const { getByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={50} />
      </ThemeProvider>
    )

    // Expected colors based on the user's mapping
    const expectedColors = {
      [HrZoneName.Max]: HEART_RATE_ZONES.find(z => z.name === 'Zone 5')?.color || '#F44336',
      [HrZoneName.Peak]: HEART_RATE_ZONES.find(z => z.name === 'Zone 4')?.color || '#FFEB3B',
      [HrZoneName.Cardio]: HEART_RATE_ZONES.find(z => z.name === 'Zone 3')?.color || '#4CAF50',
      [HrZoneName.FatBurn]: HEART_RATE_ZONES.find(z => z.name === 'Zone 2')?.color || '#2196F3',
      [HrZoneName.WarmUp]: HEART_RATE_ZONES.find(z => z.name === 'Zone 1')?.color || '#9E9E9E',
    }

    const warmUpRow = getByTestId(`zone-row-${HrZoneName.WarmUp}`)
    expect(within(warmUpRow).getByTestId('zone-color-indicator')).toHaveStyle(
      `background-color: ${expectedColors[HrZoneName.WarmUp]}`
    )

    const fatBurnRow = getByTestId(`zone-row-${HrZoneName.FatBurn}`)
    expect(within(fatBurnRow).getByTestId('zone-color-indicator')).toHaveStyle(
      `background-color: ${expectedColors[HrZoneName.FatBurn]}`
    )

    const cardioRow = getByTestId(`zone-row-${HrZoneName.Cardio}`)
    expect(within(cardioRow).getByTestId('zone-color-indicator')).toHaveStyle(
      `background-color: ${expectedColors[HrZoneName.Cardio]}`
    )

    const peakRow = getByTestId(`zone-row-${HrZoneName.Peak}`)
    expect(within(peakRow).getByTestId('zone-color-indicator')).toHaveStyle(
      `background-color: ${expectedColors[HrZoneName.Peak]}`
    )

    const maxRow = getByTestId(`zone-row-${HrZoneName.Max}`)
    expect(within(maxRow).getByTestId('zone-color-indicator')).toHaveStyle(
      `background-color: ${expectedColors[HrZoneName.Max]}`
    )
  })

  it('renders zones without explicit sorting (order depends on input object iteration)', () => {
    const timeInZones = {
      [HrZoneName.WarmUp]: 10,
      [HrZoneName.Max]: 10,
      [HrZoneName.FatBurn]: 10,
      [HrZoneName.Peak]: 10,
      [HrZoneName.Cardio]: 10,
      [HrZoneName.NoData]: 10,
      [HrZoneName.Unknown]: 10,
    } as unknown as Record<HrZoneName, number>

    const { getAllByTestId } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={70} />
      </ThemeProvider>
    )

    const rows = getAllByTestId(/^zone-row-/)
    const renderedZones = rows.map((row) => row.getAttribute('data-testid'))

    expect(renderedZones).not.toContain(`zone-row-${HrZoneName.NoData}`)
    expect(renderedZones).not.toContain(`zone-row-${HrZoneName.Unknown}`)
    expect(renderedZones).toContain(`zone-row-${HrZoneName.Max}`)
    expect(renderedZones).toContain(`zone-row-${HrZoneName.Peak}`)
    expect(renderedZones).toContain(`zone-row-${HrZoneName.Cardio}`)
    expect(renderedZones).toContain(`zone-row-${HrZoneName.FatBurn}`)
    expect(renderedZones).toContain(`zone-row-${HrZoneName.WarmUp}`)
  })
})
