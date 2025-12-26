/**
 * @jest-environment jsdom
 */
// tests/unit/components/PersonalAnalyticsDashboard.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import { PersonalAnalyticsDashboard } from '@/components/PersonalAnalyticsDashboard'

describe('PersonalAnalyticsDashboard', () => {
  it('should render the dashboard with a chart and a table', () => {
    const data = [{ time: Date.now(), hr: 120 }]
    const zoneDurations = { 'Zone 1': 60 }
    const { getByText } = render(
      <PersonalAnalyticsDashboard data={data} zoneDurations={zoneDurations} />
    )

    expect(getByText('Real-Time Heart Rate')).toBeInTheDocument()
    expect(getByText('Time in Zones')).toBeInTheDocument()
  })
})
