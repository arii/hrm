/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HeartRateZone, HR_ZONE_CONFIG } from '@/lib/shared/hr-zones'

// Mock Recharts to avoid JSDOM issues with ResponsiveContainer and SVG
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <svg data-testid="pie-chart">{children}</svg>
  ),
  Pie: ({ children }: { children: React.ReactNode }) => (
    <g data-testid="pie">{children}</g>
  ),
  Cell: () => <path data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
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
  }

  it('renders the title', () => {
    render(<ZoneDistribution timeInZones={baseTimeInZones} />)
    expect(screen.getByText('Heart Rate Zone Distribution')).toBeInTheDocument()
  })

  it('renders the zone list with all zones even with no total duration', () => {
    render(<ZoneDistribution timeInZones={baseTimeInZones} />)
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
    render(<ZoneDistribution timeInZones={baseTimeInZones} />)
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
    render(<ZoneDistribution timeInZones={timeInZones} />)
    // Multiple instances due to accessible table and visible legend
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('1:00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/60%/).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_3.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0:30').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/30%/).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_4.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0:10').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/10%/).length).toBeGreaterThanOrEqual(1)
  })

  it('displays all zones to provide a complete overview even with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 100,
    }
    render(<ZoneDistribution timeInZones={timeInZones} />)
    // Zone 2 has time
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)
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
    render(<ZoneDistribution timeInZones={timeInZones} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    // Multiple instances due to center label, legend, and table
    const timeElements = screen.getAllByText('2:00')
    expect(timeElements.length).toBeGreaterThanOrEqual(1)
  })
})
