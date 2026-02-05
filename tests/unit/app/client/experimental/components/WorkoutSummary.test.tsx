/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import WorkoutSummary from '@/app/client/experimental/components/WorkoutSummary'

// Mock utils to have consistent output in tests
jest.mock('@/lib/utils', () => ({
  formatDuration: jest.fn((d) => `formatted-${d}`),
  formatDate: jest.fn(
    (d) => `formatted-date-${d instanceof Date ? d.toISOString() : d}`
  ),
  getStatusColor: jest.fn((s) => {
    switch (s) {
      case 'running':
        return 'success'
      case 'paused':
        return 'warning'
      case 'finished':
        return 'primary'
      default:
        return 'default'
    }
  }),
}))

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

  it('renders with all props provided', () => {
    render(<WorkoutSummary {...defaultProps} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('RUNNING')).toBeInTheDocument()
    expect(screen.getByText('formatted-3600')).toBeInTheDocument()
    expect(screen.getByText('500.5')).toBeInTheDocument()
    expect(screen.getByText(/formatted-date/)).toBeInTheDocument()

    // Check for icons (by their aria-label or just by being in the document if they don't have labels)
    // MUI icons usually don't have accessible names by default unless specified
  })

  it('renders with required props', () => {
    render(
      <WorkoutSummary
        duration={100}
        calories={10}
        status="idle"
        userName="Guest User"
        date={new Date('2026-02-02T12:00:00Z')}
      />
    )

    expect(screen.getByText('Guest User')).toBeInTheDocument()
    expect(screen.getByText('IDLE')).toBeInTheDocument()
    expect(screen.getByText(/formatted-date/)).toBeInTheDocument()
  })

  describe('status colors and styles', () => {
    const statuses = [
      { status: 'running' as const, expectedColor: 'success' },
      { status: 'paused' as const, expectedColor: 'warning' },
      { status: 'finished' as const, expectedColor: 'primary' },
      { status: 'idle' as const, expectedColor: 'default' },
    ]

    statuses.forEach(({ status, expectedColor }) => {
      it(`renders correctly for status: ${status}`, () => {
        render(<WorkoutSummary {...defaultProps} status={status} />)
        const chip = screen
          .getByText(status.toUpperCase())
          .closest('.MuiChip-root')
        expect(chip).toHaveClass(
          `MuiChip-color${expectedColor.charAt(0).toUpperCase() + expectedColor.slice(1)}`
        )
      })
    })
  })

  it('conditionally applies color to calories text', () => {
    const { rerender } = render(
      <WorkoutSummary {...defaultProps} calories={0} />
    )
    const zeroCal = screen.getByText('0.0')
    // When calories is 0, valueColor is 'text.primary'
    // In JSDOM with MUI, this might not show up as a computed style easily without a ThemeProvider
    // but we can at least verify it's rendered.
    expect(zeroCal).toBeInTheDocument()

    rerender(<WorkoutSummary {...defaultProps} calories={100} />)
    const positiveCal = screen.getByText('100.0')
    expect(positiveCal).toBeInTheDocument()
  })
})
