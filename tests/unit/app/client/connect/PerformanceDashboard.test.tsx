/**
 * @jest-environment jsdom
 */
import { render } from '@testing-library/react'
import PerformanceDashboard from '@/app/client/connect/PerformanceDashboard'
import { HrZoneDuration } from '@/hooks/useHrZoneTracker'

describe('PerformanceDashboard', () => {
  it('renders correctly with data', () => {
    const hrHistory = [
      { time: 1622548800000, hr: 120 },
      { time: 1622548801000, hr: 125 },
    ]
    const zoneDurations: HrZoneDuration[] = [
      {
        zone: 1,
        name: 'Very Light',
        duration: 60,
        percentage: 10,
        color: 'grey.700',
      },
      {
        zone: 2,
        name: 'Light',
        duration: 120,
        percentage: 20,
        color: 'info.main',
      },
    ]

    const { asFragment } = render(
      <PerformanceDashboard
        hrHistory={hrHistory}
        zoneDurations={zoneDurations}
      />
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('renders correctly when hrHistory is empty', () => {
    const zoneDurations: HrZoneDuration[] = [
      {
        zone: 1,
        name: 'Very Light',
        duration: 0,
        percentage: 0,
        color: 'grey.700',
      },
    ]

    const { asFragment } = render(
      <PerformanceDashboard hrHistory={[]} zoneDurations={zoneDurations} />
    )
    expect(asFragment()).toMatchSnapshot()
  })
})
