/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HrZoneName } from '@/lib/shared/hr-zones'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme/theme'

const mockTimeInZones = {
  [HrZoneName.WarmUp]: 120,
  [HrZoneName.FatBurn]: 300,
  [HrZoneName.Cardio]: 600,
  [HrZoneName.Peak]: 180,
  [HrZoneName.Max]: 60,
  [HrZoneName.NoData]: 0,
  [HrZoneName.Unknown]: 0,
}

const totalDuration = 1260

describe('ZoneDistribution', () => {
  it('renders the correct number of zones', () => {
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution
          timeInZones={mockTimeInZones}
          totalDuration={totalDuration}
        />
      </ThemeProvider>
    )
    // Filters out NoData, Unknown, and zones with 0 time
    const renderedZones = screen.getAllByRole('progressbar')
    expect(renderedZones).toHaveLength(5)
  })

  it('displays the correct labels and times', () => {
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution
          timeInZones={mockTimeInZones}
          totalDuration={totalDuration}
        />
      </ThemeProvider>
    )

    expect(screen.getByText('Warm-up')).toBeInTheDocument()
    expect(screen.getByText('2:00')).toBeInTheDocument()
  })

  it('does not render zones with zero time', () => {
    const timeInZonesWithZero = { ...mockTimeInZones, [HrZoneName.Max]: 0 }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution
          timeInZones={timeInZonesWithZero}
          totalDuration={1200}
        />
      </ThemeProvider>
    )

    const renderedZones = screen.getAllByRole('progressbar')
    expect(renderedZones).toHaveLength(4)
    expect(screen.queryByText('Max')).not.toBeInTheDocument()
  })

  it('filters out NoData and Unknown zones', () => {
    const timeInZonesWithNoData = {
      ...mockTimeInZones,
      [HrZoneName.NoData]: 50,
      [HrZoneName.Unknown]: 50,
    }
    render(
      <ThemeProvider theme={theme}>
        <ZoneDistribution
          timeInZones={timeInZonesWithNoData}
          totalDuration={1360}
        />
      </ThemeProvider>
    )
    expect(screen.queryByText(HrZoneName.NoData)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Unknown)).not.toBeInTheDocument()
  })
})
