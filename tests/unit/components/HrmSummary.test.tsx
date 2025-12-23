/** @jest-environment jsdom */
// File: tests/unit/components/HrmSummary.test.tsx
import { render, screen } from '@testing-library/react'
import HrmSummary from '../../../components/HrmSummary'
import { HrmDataPoint } from '../../../services/hrmDataService'
import '@testing-library/jest-dom'

describe('HrmSummary', () => {
  it('should render the summary statistics correctly', () => {
    const data: HrmDataPoint[] = [
      { timestamp: Date.now(), hrm: 100, clientId: 'test' },
      { timestamp: Date.now(), hrm: 120, clientId: 'test' },
      { timestamp: Date.now(), hrm: 140, clientId: 'test' },
    ]
    render(<HrmSummary data={data} />)

    expect(screen.getByText('120')).toBeInTheDocument() // Avg
    expect(screen.getByText('140')).toBeInTheDocument() // Max
    expect(screen.getByText('100')).toBeInTheDocument() // Min
  })
})
