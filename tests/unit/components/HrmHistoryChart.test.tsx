/** @jest-environment jsdom */
// File: tests/unit/components/HrmHistoryChart.test.tsx
import { render, screen } from '@testing-library/react'
import HrmHistoryChart from '../../../components/HrmHistoryChart'
import { HrmDataPoint } from '../../../services/hrmDataService'
import '@testing-library/jest-dom'

// Mock the Recharts library
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Line: () => <div />,
  Area: () => <div />,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}))

describe('HrmHistoryChart', () => {
  it('should render the chart with the provided data', () => {
    const data: HrmDataPoint[] = [
      { timestamp: Date.now(), hrm: 120, clientId: 'test' },
    ]
    render(<HrmHistoryChart data={data} />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
  })
})
