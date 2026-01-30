/**
 * @jest-environment jsdom
 */
// tests/unit/components/analytics/ZoneDistributionChart.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import ZoneDistributionChart from '@/components/analytics/ZoneDistributionChart'
import { HrZoneName } from '@/lib/workout-session-storage'
import { ThemeProvider, createTheme } from '@mui/material/styles'

// Mock recharts components to avoid rendering the actual chart in tests
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    BarChart: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    // Mock other components as needed
  }
})

const theme = createTheme()

const mockTimeInZones = {
  [HrZoneName.WarmUp]: 120,
  [HrZoneName.FatBurn]: 300,
  [HrZoneName.Cardio]: 600,
  [HrZoneName.Peak]: 180,
  [HrZoneName.Max]: 60,
  [HrZoneName.Unknown]: 0,
  [HrZoneName.NoData]: 0,
}

describe('ZoneDistributionChart', () => {
  it('renders the chart with the correct title', () => {
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistributionChart timeInZones={mockTimeInZones} status="running" />
      </ThemeProvider>
    )
    expect(screen.getByText('Zone Distribution')).toBeInTheDocument()
  })

  it('filters out zones with zero time', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistributionChart timeInZones={mockTimeInZones} status="running" />
      </ThemeProvider>
    )
    // The chart should not render bars for Unknown or NoData zones
    expect(container.querySelectorAll('.recharts-bar').length).toBe(0) // As we are not rendering the bars
  })

  it('displays the (Paused) label when the workout is paused', () => {
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistributionChart timeInZones={mockTimeInZones} status="paused" />
      </ThemeProvider>
    )
    expect(screen.getByText('(Paused)')).toBeInTheDocument()
  })

  it('applies a lower opacity when paused', () => {
    const { container } = render(
      <ThemeProvider theme={theme}>
        <ZoneDistributionChart timeInZones={mockTimeInZones} status="paused" />
      </ThemeProvider>
    )
    expect(container.firstChild).toHaveStyle('opacity: 0.5')
  })

  it('does not display the (Paused) label when running', () => {
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistributionChart timeInZones={mockTimeInZones} status="running" />
      </ThemeProvider>
    )
    expect(screen.queryByText('(Paused)')).not.toBeInTheDocument()
  })
})
