/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import ZoneDistribution from '@/app/client/experimental/components/ZoneDistribution'
import { HrZoneName } from '@/utils/hr-zones'

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
    render(<ZoneDistribution timeInZones={baseTimeInZones} userAge={30} />)
    expect(screen.getByText('Time in Zones')).toBeInTheDocument()
  })

  it('renders correctly with no time in any zone', () => {
    render(<ZoneDistribution timeInZones={baseTimeInZones} userAge={30} />)
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
    render(<ZoneDistribution timeInZones={timeInZones} userAge={30} />)
    expect(screen.getByText(HrZoneName.WarmUp)).toBeInTheDocument()
    expect(screen.getByText('60s (60.0%)')).toBeInTheDocument()
    expect(screen.getByText(HrZoneName.FatBurn)).toBeInTheDocument()
    expect(screen.getByText('30s (30.0%)')).toBeInTheDocument()
    expect(screen.getByText(HrZoneName.Cardio)).toBeInTheDocument()
    expect(screen.getByText('10s (10.0%)')).toBeInTheDocument()
  })

  it('does not display zones with no time', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.WarmUp]: 100,
    }
    render(<ZoneDistribution timeInZones={timeInZones} userAge={30} />)
    expect(screen.getByText(HrZoneName.WarmUp)).toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.FatBurn)).not.toBeInTheDocument()
  })

  it('filters out NoData and Unknown zones', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.NoData]: 50,
      [HrZoneName.Unknown]: 50,
    }
    render(<ZoneDistribution timeInZones={timeInZones} userAge={30} />)
    expect(screen.queryByText(HrZoneName.NoData)).not.toBeInTheDocument()
    expect(screen.queryByText(HrZoneName.Unknown)).not.toBeInTheDocument()
  })

  it('uses a default age when userAge is null', () => {
    const timeInZones = {
      ...baseTimeInZones,
      [HrZoneName.FatBurn]: 120,
    }
    render(<ZoneDistribution timeInZones={timeInZones} userAge={null} />)
    expect(screen.getByText(HrZoneName.FatBurn)).toBeInTheDocument()
    expect(screen.getByText('120s (100.0%)')).toBeInTheDocument()
  })
})
