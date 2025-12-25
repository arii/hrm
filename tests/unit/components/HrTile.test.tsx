/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import HrTile from '@/components/HrTile'
import { render, screen } from '../../test-utils'
import '@testing-library/jest-dom'
import { useTheme } from '@mui/material/styles'

jest.mock('@mui/material/styles', () => ({
  ...jest.requireActual('@mui/material/styles'),
  useTheme: jest.fn(),
}))

const mockedUseTheme = useTheme as jest.Mock

const mockTheme = {
  palette: {
    secondary: { main: '#dc004e' },
    success: { main: '#388e3c' },
    warning: { dark: '#f57c00' },
    primary: { main: '#1976d2' },
    getContrastText: () => '#fff',
  },
  transitions: {
    create: () => 'none',
    duration: {
      short: 250,
    },
  },
}

describe('HrTile', () => {
  beforeEach(() => {
    mockedUseTheme.mockReturnValue(mockTheme)
  })

  it('renders the correct background and text color for the Peak zone', () => {
    render(<HrTile name="Test" bpm={180} percentMax={95} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${mockTheme.palette.primary.main}`)
    expect(card).toHaveStyle(
      `color: ${mockTheme.palette.getContrastText(mockTheme.palette.primary.main)}`
    )
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    render(<HrTile name="Test" bpm={160} percentMax={85} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${mockTheme.palette.warning.dark}`)
    expect(card).toHaveStyle(
      `color: ${mockTheme.palette.getContrastText(mockTheme.palette.warning.dark)}`
    )
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    render(<HrTile name="Test" bpm={140} percentMax={75} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${mockTheme.palette.success.main}`)
    expect(card).toHaveStyle(
      `color: ${mockTheme.palette.getContrastText(mockTheme.palette.success.main)}`
    )
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    render(<HrTile name="Test" bpm={120} percentMax={65} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${mockTheme.palette.secondary.main}`)
    expect(card).toHaveStyle(
      `color: ${mockTheme.palette.getContrastText(mockTheme.palette.secondary.main)}`
    )
  })
})
