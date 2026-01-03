/** @jest-environment jsdom */
import React from 'react'
import { render } from '@testing-library/react'
import HrZoneDistributionChart from '@/app/client/connect/charts/HrZoneDistributionChart'
import { ZoneData } from '@/hooks/useHeartRateHistory'

// Mock Recharts to prevent rendering errors in JSDOM
jest.mock('recharts', () => {
  const OriginalRecharts = jest.requireActual('recharts')
  return {
    ...OriginalRecharts,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  }
})

describe('HrZoneDistributionChart', () => {
  const zoneDistribution: ZoneData = {
    grey: 120,
    blue: 300,
    green: 600,
    yellow: 120,
    red: 30,
    purple: 0,
  }

  it('should render correctly with data', () => {
    const { asFragment } = render(
      <HrZoneDistributionChart zoneDistribution={zoneDistribution} />
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('should return null when zoneDistribution is empty', () => {
    const emptyZoneDistribution: ZoneData = {
      grey: 0,
      blue: 0,
      green: 0,
      yellow: 0,
      red: 0,
      purple: 0,
    }
    const { container } = render(
      <HrZoneDistributionChart zoneDistribution={emptyZoneDistribution} />
    )
    expect(container.firstChild).toBeNull()
  })
})
