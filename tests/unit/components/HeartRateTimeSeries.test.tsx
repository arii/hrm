/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import HeartRateTimeSeries from '@/components/HeartRateTimeSeries'
import { HrDataPoint } from '@/lib/workout-session-storage'

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('HeartRateTimeSeries', () => {
  const mockHrHistory: HrDataPoint[] = [
    { time: new Date('2023-01-01T10:00:00').getTime(), hr: 60 },
    { time: new Date('2023-01-01T10:00:05').getTime(), hr: 65 },
  ]

  it('renders the title', () => {
    render(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    expect(screen.getByText('Heart Rate Over Time')).toBeInTheDocument()
  })

  it('renders with the correct data-testid', () => {
    render(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    expect(screen.getByTestId('hr-time-series-chart')).toBeInTheDocument()
  })
})
