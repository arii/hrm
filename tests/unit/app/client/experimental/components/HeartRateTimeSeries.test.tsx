/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  ConnectedHeartRateChart,
  HeartRateTimeSeries,
} from '@/app/client/experimental/components/HeartRateTimeSeries'
import { ThemeProvider } from '@mui/material/styles'
import theme from '@/theme/theme'
import { UserSettingsProvider } from '@/context/UserSettingsContext'

// Mock Recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ReferenceArea: () => <div />,
  Label: () => <div />,
}))

// Mock ResizeObserver for Recharts (though we mocked Recharts itself, some internals might still look for it)
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('HeartRateTimeSeries Components', () => {
  const mockData = [
    { timestamp: new Date('2023-01-01T10:00:00').getTime(), hr: 60 },
    { timestamp: new Date('2023-01-01T10:00:05').getTime(), hr: 65 },
  ]

  describe('HeartRateTimeSeries (Pure Component)', () => {
    it('renders the title', () => {
      render(
        <ThemeProvider theme={theme}>
          <HeartRateTimeSeries data={mockData} />
        </ThemeProvider>
      )
      expect(screen.getByText('Heart Rate Analysis')).toBeInTheDocument()
    })

    it('renders with the correct data-testid', () => {
      render(
        <ThemeProvider theme={theme}>
          <HeartRateTimeSeries data={mockData} />
        </ThemeProvider>
      )
      expect(screen.getByTestId('hr-time-series-chart')).toBeInTheDocument()
    })
  })

  describe('ConnectedHeartRateChart (Wrapper Component)', () => {
    it('renders the title when wrapped in provider', () => {
      render(
        <UserSettingsProvider>
          <ThemeProvider theme={theme}>
            <ConnectedHeartRateChart data={mockData} />
          </ThemeProvider>
        </UserSettingsProvider>
      )
      expect(screen.getByText('Heart Rate Analysis')).toBeInTheDocument()
    })
  })
})
