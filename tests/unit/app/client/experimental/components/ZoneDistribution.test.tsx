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
    const timeInZones: Record<HeartRateZone, number> = {
      ...baseTimeInZones,
      ZONE_2: 20, // 20/30 = 66.7%
      ZONE_4: 10, // 10/30 = 33.3%
    }
    render(<ZoneDistribution timeInZones={timeInZones} />)

    // Check for zone names (multiple instances due to hidden table)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/66\.7%/).length).toBeGreaterThanOrEqual(1)

    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_4.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/33\.3%/).length).toBeGreaterThanOrEqual(1)
  })

  it('filters out zero-time zones from the visual list', () => {
    const timeInZones: Record<HeartRateZone, number> = {
      ...baseTimeInZones,
      ZONE_2: 120,
    }
    render(<ZoneDistribution timeInZones={timeInZones} />)

    // Zone 2 is present
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)

    // Zone 3 has no time and should NOT be in the visual list (but might be in the hidden table)
    // Actually, our current implementation filters them out of 'data' entirely.
    expect(
      screen.queryByText(HR_ZONE_CONFIG.ZONE_3.label)
    ).not.toBeInTheDocument()
  })
})
