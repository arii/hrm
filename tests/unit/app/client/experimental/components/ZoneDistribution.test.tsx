/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, within } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme/theme'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HrZoneName } from '@/lib/shared/hr-zones'

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
  const baseTimeInZones = {
    [HrZoneName.WarmUp]: 0,
    [HrZoneName.FatBurn]: 0,
    [HrZoneName.Cardio]: 0,
    [HrZoneName.Peak]: 0,
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

  it('filters out NoData and Unknown zones', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.NoData]: 50,
      [HrZoneName.Unknown]: 50,
    }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution timeInZones={timeInZones} totalDuration={100} />
      </ThemeProvider>
    )
    expect(screen.queryByText(HrZoneName.NoData)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Unknown)).not.toBeInTheDocument()
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
})
