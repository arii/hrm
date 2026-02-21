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
    render(<ZoneDistribution timeInZones={baseTimeInZones} />)
    // If no data (all 0), it renders "Time in Zones" inside the "No data" card
    expect(screen.getByText('Time in Zones')).toBeInTheDocument()
  })

  it('renders "No zone data available" when all zones are zero', () => {
    render(<ZoneDistribution timeInZones={baseTimeInZones} />)
    expect(
      screen.getByText('No zone data available for this session.')
    ).toBeInTheDocument()
  })

  it('calculates and displays the time and percentage for each zone', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 60,
      ZONE_3: 30,
      ZONE_4: 10,
    }
    render(<ZoneDistribution timeInZones={timeInZones} />)

    // Check for zone names (multiple instances due to hidden table)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/1:00/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/60\.0%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_3.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/0:30/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/30\.0%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_4.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/0:10/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/10\.0%/).length).toBeGreaterThanOrEqual(1)

    // Verify progress bars are rendered with correct values
    const progressBars = screen.getAllByRole('progressbar')
    expect(progressBars).toHaveLength(3)
    // Sorted by HR_ZONE_ORDER (highest intensity first)
    // ZONE_4 (Cardio) -> ZONE_3 (Fat Burn) -> ZONE_2 (Warm Up)
    expect(progressBars[0]).toHaveAttribute('aria-valuenow', '10') // Cardio
    expect(progressBars[1]).toHaveAttribute('aria-valuenow', '30') // Fat Burn
    expect(progressBars[2]).toHaveAttribute('aria-valuenow', '60') // Warm Up
  })

  it('displays zones with less than 1% time in the list', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 100, // 99.5% roughly
      ZONE_3: 0.5, // 0.5% of 100.5 total
    }
    render(<ZoneDistribution timeInZones={timeInZones} />)

    // Zone 2 (Warm Up) should be visible
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)

    // Zone 3 (Fat Burn) should ALSO be in the list
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_3.label).length
    ).toBeGreaterThanOrEqual(1)
  })
})
