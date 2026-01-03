/** @jest-environment jsdom */
import React from 'react'
import { render } from '@testing-library/react'
import HrHistoryChart from '@/app/client/connect/charts/HrHistoryChart'
import { HeartRateSample } from '@/hooks/useHeartRateHistory'

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

describe('HrHistoryChart', () => {
  const maxHr = 200
  const history: HeartRateSample[] = [
    { timestamp: 1672531200000, hr: 120 },
    { timestamp: 1672531201000, hr: 125 },
    { timestamp: 1672531202000, hr: 130 },
  ]

  it('should render correctly with data', () => {
    const { asFragment } = render(
      <HrHistoryChart history={history} maxHr={maxHr} />
    )
    expect(asFragment()).toMatchSnapshot()
  })

  it('should return null when history is empty', () => {
    const { container } = render(<HrHistoryChart history={[]} maxHr={maxHr} />)
    expect(container.firstChild).toBeNull()
  })
})
