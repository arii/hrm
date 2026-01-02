/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTimelineChart.test.tsx
import { render, screen } from '@testing-library/react'
import HrTimelineChart from '@/components/HrTimelineChart'

describe('HrTimelineChart', () => {
  it('should render the "Waiting for heart rate data..." message when no data is provided', () => {
    render(<HrTimelineChart data={{}} maxHr={190} />)
    expect(
      screen.getByText('Waiting for heart rate data...')
    ).toBeInTheDocument()
  })

  it('should render the chart when data is provided', () => {
    const data = {
      client1: [
        { value: 120, timestamp: Date.now() },
        { value: 125, timestamp: Date.now() + 1000 },
      ],
    }
    const { container } = render(<HrTimelineChart data={data} maxHr={190} />)
    expect(screen.getByText('Heart Rate Timeline')).toBeInTheDocument()
    expect(
      container.querySelector('.recharts-responsive-container')
    ).toBeInTheDocument()
  })
})
