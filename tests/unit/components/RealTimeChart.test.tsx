import { render, screen } from '@testing-library/react'
import RealTimeChart from '@/app/client/connect/components/RealTimeChart'

describe('RealTimeChart', () => {
  it('should render the chart with the correct title', () => {
    render(<RealTimeChart data={[]} />)
    expect(screen.getByText('Workout Analysis')).toBeInTheDocument()
  })
})
