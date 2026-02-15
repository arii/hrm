/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material'
import WorkoutSummary from '@/app/client/experimental/components/WorkoutSummary'

// Mock utils to have consistent output in tests
jest.mock('@/lib/utils', () => ({
  formatDuration: jest.fn((d) => `formatted-${d}`),
  formatDate: jest.fn(
    (d) => `formatted-date-${d instanceof Date ? d.toISOString() : d}`
  ),
}))

const theme = createTheme({
  palette: {
    custom: {
      running: '#4CAF50',
      idle: '#cccccc',
      paused: '#FBC02D',
      finished: '#2196F3',
    },
  },
})

describe('WorkoutSummary', () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-02-02T12:00:00Z'))
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  const defaultProps = {
    duration: 3600,
    calories: 500.5,
    status: 'running' as const,
    userName: 'Test User',
    date: new Date('2026-02-02T12:00:00Z'),
  }

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders with all props provided', () => {
    renderWithTheme(<WorkoutSummary {...defaultProps} />)

    expect(screen.getByText('Workout Summary')).toBeInTheDocument()
    expect(screen.getByText(/Test User/)).toBeInTheDocument()
    expect(screen.getByText('RUNNING')).toBeInTheDocument()
    expect(screen.getByText('formatted-3600')).toBeInTheDocument()
    // 500.5.toFixed(0) is 501
    expect(screen.getByText('501')).toBeInTheDocument()
    expect(screen.getByText(/formatted-date/)).toBeInTheDocument()
  })

  it('renders with required props', () => {
    renderWithTheme(
      <WorkoutSummary
        duration={100}
        calories={10}
        status="idle"
        userName="Guest User"
        date={new Date('2026-02-02T12:00:00Z')}
      />
    )

    expect(
      screen.getByText('Guest User • formatted-date-2026-02-02T12:00:00.000Z')
    ).toBeInTheDocument()
    expect(screen.getByText('IDLE')).toBeInTheDocument()
  })

  describe('status display', () => {
    const statuses = [
      { status: 'running' as const, expectedColor: 'rgb(76, 175, 80)' }, // #4CAF50
      { status: 'paused' as const, expectedColor: 'rgb(251, 192, 45)' }, // #FBC02D
      { status: 'finished' as const, expectedColor: 'rgb(33, 150, 243)' }, // #2196F3
      { status: 'idle' as const, expectedColor: 'rgb(204, 204, 204)' }, // #cccccc
    ]

    statuses.forEach(({ status, expectedColor }) => {
      it(`renders status text and color for: ${status}`, () => {
        renderWithTheme(<WorkoutSummary {...defaultProps} status={status} />)
        const chip = screen
          .getByText(status.toUpperCase())
          .closest('.MuiChip-root')
        expect(chip).toHaveStyle({ backgroundColor: expectedColor })
      })
    })
  })
})
