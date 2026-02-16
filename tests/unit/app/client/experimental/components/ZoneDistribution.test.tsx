/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HrZoneName } from '@/lib/shared/hr-zones'

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
    render(
      <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={100} />
    )
    expect(screen.getByText('Time in Zones')).toBeInTheDocument()
  })

  it('renders correctly with no time in any zone', () => {
    render(
      <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={100} />
    )
    // Should show "No zone data available" message
    expect(
      screen.getByText('No zone data available for this session.')
    ).toBeInTheDocument()
  })

  it('calculates and displays the time and percentage for each zone', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.WarmUp]: 60,
      [HrZoneName.FatBurn]: 30,
      [HrZoneName.Cardio]: 10,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)

    // Check for zone names (multiple instances due to hidden table)
    expect(
      screen.getAllByText(HrZoneName.WarmUp).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/01:00/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/60\.0%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HrZoneName.FatBurn).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/00:30/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/30\.0%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HrZoneName.Cardio).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/00:10/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/10\.0%/).length).toBeGreaterThanOrEqual(1)

    // Verify progress bars are rendered with correct values (sorted by intensity: Cardio, FatBurn, WarmUp)
    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars).toHaveLength(3)
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '10')
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '30')
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '60')
  })

  it('does not display zones with less than 1% time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.WarmUp]: 100,
      [HrZoneName.FatBurn]: 0.5, // 0.5% of 100
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    expect(
      screen.getAllByText(HrZoneName.WarmUp).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(HrZoneName.FatBurn)).not.toBeInTheDocument()
    // Should show the note about hidden zones
    expect(
      screen.getByText(
        'Zones with less than 1% duration are hidden for clarity.'
      )
    ).toBeInTheDocument()
  })

  it('filters out NoData and Unknown zones', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.NoData]: 50,
      [HrZoneName.Unknown]: 50,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    // data.length will be 0 (after filtering), so it shows "No zone data available"
    expect(
      screen.getByText('No zone data available for this session.')
    ).toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.NoData)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Unknown)).not.toBeInTheDocument()
  })
})
