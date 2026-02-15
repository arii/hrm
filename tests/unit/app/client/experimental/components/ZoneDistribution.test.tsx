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
    render(
      <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={100} />
    )
    expect(screen.getByText('Heart Rate Zone Distribution')).toBeInTheDocument()
  })

  it('renders correctly with no time in any zone', () => {
    render(
      <ZoneDistribution timeInZones={baseTimeInZones} totalDuration={100} />
    )
    // Should show "No zone data available" message when data.length === 0
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
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
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

  it('does not display zones with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_2: 100,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    expect(
      screen.getAllByText(HR_ZONE_CONFIG.ZONE_2.label).length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.queryByText(HR_ZONE_CONFIG.ZONE_3.label)
    ).not.toBeInTheDocument()
  })

  it('filters out Idle zone (ZONE_0)', () => {
    const timeInZones = {
      ...baseTimeInZones,
      ZONE_0: 50,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    // data.length will be 0, so it shows "No zone data available"
    expect(
      screen.getByText('No zone data available for this session.')
    ).toBeInTheDocument()
    expect(
      screen.queryByText(HR_ZONE_CONFIG.ZONE_0.label)
    ).not.toBeInTheDocument()
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
