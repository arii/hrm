/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import HeartRateTimeSeries from '@/app/client/experimental/components/HeartRateTimeSeries'
import { HrDataPoint } from '@/lib/workout-session-storage'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/lib/theme'

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock Recharts to test props
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts')
  return {
    ...OriginalModule,
    LineChart: ({
      children,
      syncId,
      data,
    }: {
      children: React.ReactNode
      syncId: string
      data: unknown[]
    }) => (
      <div
        data-testid="line-chart"
        data-sync-id={syncId}
        data-points={data.length}
      >
        {children}
      </div>
    ),
    XAxis: ({
      tickFormatter,
      dataKey,
    }: {
      tickFormatter: (val: number) => string
      dataKey: string
    }) => (
      <div data-testid="x-axis" data-key={dataKey}>
        {/* Render a sample tick to verify formatter */}
        {tickFormatter
          ? tickFormatter(new Date('2023-01-01T10:00:00').getTime())
          : null}
      </div>
    ),
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
  }
})

describe('HeartRateTimeSeries', () => {
  const mockHrHistory: HrDataPoint[] = [
    { time: new Date('2023-01-01T10:00:00').getTime(), hr: 60 },
    { time: new Date('2023-01-01T10:00:05').getTime(), hr: 65 },
  ]

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
  }

  it('renders the title', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    expect(screen.getByText('Heart Rate Over Time')).toBeInTheDocument()
  })

  it('passes syncId="workout-metrics" to LineChart', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    const chart = screen.getByTestId('line-chart')
    expect(chart).toHaveAttribute('data-sync-id', 'workout-metrics')
  })

  it('uses the correct time format in XAxis', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    // The formatter uses { timeStyle: 'medium' }, which should output something like "10:00:00 AM" depending on locale.
    // Since node environment locale might vary, we check if it renders *something* formatted.
    // However, the test environment (jsdom) usually defaults to en-US.
    // "10:00:00 AM" or "10:00:00"
    const axis = screen.getByTestId('x-axis')
    expect(axis).toHaveTextContent(/:00/) // Simple check for time format
  })
})
