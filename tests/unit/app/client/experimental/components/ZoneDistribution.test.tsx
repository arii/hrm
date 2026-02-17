/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HeartRateZone, HR_ZONE_CONFIG } from '@/lib/shared/hr-zones'

describe('ZoneDistribution', () => {
  const baseTimeInZones: Record<HeartRateZone, number> = {
    ZONE_0: 0,
    ZONE_1: 0,
    ZONE_2: 0,
    ZONE_3: 0,
    ZONE_4: 0,
    ZONE_5: 0,
    ZONE_6: 0,
  }

  it('renders the title', () => {
    render(
      <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={100} />
    )
    expect(screen.getByText('Time in Zones')).toBeInTheDocument()
  })

  it('renders the zone list with all zones even with no total duration', () => {
    render(<ZoneDistribution timeInZones={baseTimeInZones} totalDuration={0} />)
    // Should NOT show "No zone data available" message
    expect(
      screen.queryByText('No zone data available for this session.')
    ).not.toBeInTheDocument()
    // Should show all zones with 0%
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_0.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_6.label).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('renders the zone list even with no time in any zone if duration exists', () => {
    render(
      <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={100} />
    )
    // Should show "No zone data available" message
    // Should show the distribution overview even if all zones are at 0%
    expect(
      screen.queryByText('No zone data available for this session.')
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_0.label).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('calculates and displays the time and percentage for each zone', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 60,
      ZONE_3: 30,
      ZONE_4: 10,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)

    // Check for zone names (multiple instances due to hidden table)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/01:00/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/60\.0%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_3.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/00:30/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/30\.0%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_4.label).length
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
  it('displays all zones to provide a complete overview even with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 100,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    // Zone 2 has time
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
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
    // Zone 3 has no time but is still displayed for overview
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_3.label).length
    ).toBeGreaterThanOrEqual(1)
    // Idle zone (ZONE_0) is also displayed
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_0.label).length
    ).toBeGreaterThanOrEqual(1)
  })

  it('displays correct total duration in the center', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 120,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={120} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    // Multiple instances due to center label, legend, and table
    const timeElements = screen.getAllByText('2:00')
    expect(timeElements.length).toBeGreaterThanOrEqual(1)
  })
})
