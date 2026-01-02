/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import RealTimeChart from '../../../app/client/connect/components/RealTimeChart'
import { ThemeProvider } from '@mui/material/styles'
import theme from '../../../lib/theme'

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div style={{ width: 500, height: 300 }}>{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-area-chart">{children}</div>
  ),
  CartesianGrid: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Area: () => <div />,
}))

const mockData = [
  { datapointCount: 1, hr: 100, calories: 10 },
  { datapointCount: 2, hr: 110, calories: 20 },
  { datapointCount: 3, hr: 120, calories: 30 },
]

describe('RealTimeChart', () => {
  it('should render the chart with the correct data', () => {
    render(
      <ThemeProvider theme={theme}>
        <RealTimeChart data={mockData} />
      </ThemeProvider>
    )

    // Check that the chart is rendered
    expect(screen.getByTestId('mock-area-chart')).toBeInTheDocument()
  })
})
