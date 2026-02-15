/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import HeartRateTimeSeries from '@/app/client/experimental/components/HeartRateTimeSeries'
import { HrDataPoint } from '@/lib/workout-session-storage'

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const theme = createTheme({
  palette: {
    primary: {
      main: '#F44336',
    },
  },
})

describe('HeartRateTimeSeries', () => {
  const mockHrHistory: HrDataPoint[] = [
    { time: new Date('2023-01-01T10:00:00').getTime(), hr: 60 },
    { time: new Date('2023-01-01T10:00:05').getTime(), hr: 65 },
  ]

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders the title', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    expect(screen.getByText('Heart Rate Over Time')).toBeInTheDocument()
  })

  it('renders with the correct data-testid and styles', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    const chartContainer = screen.getByTestId('hr-time-series-chart')
    expect(chartContainer).toBeInTheDocument()
    expect(chartContainer).toHaveStyle({ height: '300px', minHeight: '300px' })
  })
})
