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
    expect(screen.queryByText(HrZoneName.WarmUp)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.FatBurn)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Cardio)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Peak)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Max)).not.toBeInTheDocument()
  })

  it('calculates and displays the time and percentage for each zone', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.WarmUp]: 60,
      [HrZoneName.FatBurn]: 30,
      [HrZoneName.Cardio]: 10,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    expect(screen.getByText(HrZoneName.WarmUp)).toBeInTheDocument()
    expect(screen.getByText('1:00')).toBeInTheDocument() // 60s formatted as MM:SS
    expect(screen.getByText(/60\.0%/)).toBeInTheDocument()
    expect(screen.getByText(HrZoneName.FatBurn)).toBeInTheDocument()
    expect(screen.getByText('0:30')).toBeInTheDocument() // 30s formatted as MM:SS
    expect(screen.getByText(/30\.0%/)).toBeInTheDocument()
    expect(screen.getByText(HrZoneName.Cardio)).toBeInTheDocument()
    expect(screen.getByText('0:10')).toBeInTheDocument() // 10s formatted as MM:SS
    expect(screen.getByText(/10\.0%/)).toBeInTheDocument()
  })

  it('does not display zones with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.WarmUp]: 100,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    expect(screen.getByText(HrZoneName.WarmUp)).toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.FatBurn)).not.toBeInTheDocument()
  })

  it('filters out NoData and Unknown zones', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.NoData]: 50,
      [HrZoneName.Unknown]: 50,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={100} />)
    expect(screen.queryByText(HrZoneName.NoData)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Unknown)).not.toBeInTheDocument()
  })

  it('uses a default age when userAge is null', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.FatBurn]: 120,
    }
    render(<ZoneDistribution timeInZones={timeInZones} totalDuration={120} />)
    expect(screen.getByText(HrZoneName.FatBurn)).toBeInTheDocument()
    expect(screen.getByText('2:00')).toBeInTheDocument() // 120s formatted as MM:SS
    expect(screen.getByText(/100\.0%/)).toBeInTheDocument()
  })
})
