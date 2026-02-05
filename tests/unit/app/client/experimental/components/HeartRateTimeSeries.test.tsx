/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import HeartRateTimeSeries from '@/app/client/experimental/components/HeartRateTimeSeries'
import { HrDataPoint } from '@/lib/workout-session-storage'
import { ThemeProvider, createTheme } from '@mui/material/styles'

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const mockTheme = createTheme({
  palette: {
    custom: {
      work: '#ef4444',
    },
  },
})

describe('HeartRateTimeSeries', () => {
  const mockHrHistory: HrDataPoint[] = [
    { time: new Date('2023-01-01T10:00:00').getTime(), hr: 60 },
    { time: new Date('2023-01-01T10:00:05').getTime(), hr: 65 },
  ]

  const renderWithTheme = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={mockTheme}>{component}</ThemeProvider>)
  }

  it('renders the title', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    expect(screen.getByText('Heart Rate Over Time')).toBeInTheDocument()
  })

  it('renders with the correct data-testid', () => {
    renderWithTheme(<HeartRateTimeSeries hrHistory={mockHrHistory} />)
    expect(screen.getByTestId('hr-time-series-chart')).toBeInTheDocument()
  })
})
