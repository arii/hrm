import { render, screen } from '@testing-library/react'
import RealTimeChart from '@/app/client/connect/components/RealTimeChart'

// Mock the ResponsiveContainer to render children in a test environment
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: 500, height: 300 }}>{children}</div>
    ),
  }
})

const createWorkoutHistory = (points: { hr: number; calories: number }[]) => {
  return points.map((point, index) => ({
    time: index * 60,
    ...point,
  }))
}

describe('RealTimeChart', () => {
  it('should render the chart with the correct title', () => {
    render(<RealTimeChart data={[]} />)
    expect(screen.getByText('Workout Analysis')).toBeInTheDocument()
  })

  it('should render the chart with data', () => {
    const data = createWorkoutHistory([
      { hr: 80, calories: 10 },
      { hr: 120, calories: 50 },
    ])
    const { container } = render(<RealTimeChart data={data} />)
    expect(container.querySelector('.recharts-surface')).toBeInTheDocument()
  })
})
