/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { getHrZoneProps } from '@/utils/visualization'
import { theme } from '@/lib/theme'
import { ThemeProvider } from '@mui/material/styles'
import { HrZoneName } from '@/lib/shared/hr-zones'

// Mock the getHrZoneProps function to control the test cases
jest.mock('@/utils/visualization', () => ({
  ...jest.requireActual('@/utils/visualization'),
  getHrZoneProps: jest.fn(),
}))

const mockedGetHrZoneProps = getHrZoneProps as jest.Mock

describe('HrTile', () => {
  const renderWithProviders = (component: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>)
  }

  it('renders the correct background and text color for the Peak zone', () => {
    mockedGetHrZoneProps.mockReturnValue({
      zone: HrZoneName.Peak,
      percentage: 95,
      backgroundColor: theme.palette.primary.main,
      textColor: theme.palette.getContrastText(theme.palette.primary.main),
    })
    renderWithProviders(<HrTile name="Test" bpm={180} percentMax={95} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.primary.main}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(theme.palette.primary.main)}`
    )
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    mockedGetHrZoneProps.mockReturnValue({
      zone: HrZoneName.Cardio,
      percentage: 85,
      backgroundColor: theme.palette.warning.dark,
      textColor: theme.palette.getContrastText(theme.palette.warning.dark),
    })
    renderWithProviders(<HrTile name="Test" bpm={160} percentMax={85} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.warning.dark}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(theme.palette.warning.dark)}`
    )
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    mockedGetHrZoneProps.mockReturnValue({
      zone: HrZoneName.FatBurn,
      percentage: 75,
      backgroundColor: theme.palette.success.main,
      textColor: theme.palette.getContrastText(theme.palette.success.main),
    })
    renderWithProviders(<HrTile name="Test" bpm={140} percentMax={75} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.success.main}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(theme.palette.success.main)}`
    )
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    mockedGetHrZoneProps.mockReturnValue({
      zone: HrZoneName.WarmUp,
      percentage: 65,
      backgroundColor: theme.palette.secondary.main,
      textColor: theme.palette.getContrastText(theme.palette.secondary.main),
    })
    renderWithProviders(<HrTile name="Test" bpm={120} percentMax={65} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(
      `background-color: ${theme.palette.secondary.main}`
    )
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(theme.palette.secondary.main)}`
    )
  })

  it('renders the correct background and text color for the low-intensity zone', () => {
    mockedGetHrZoneProps.mockReturnValue({
      zone: HrZoneName.NoData,
      percentage: 55,
      backgroundColor: '#9ca3af',
      textColor: theme.palette.getContrastText('#9ca3af'),
    })
    renderWithProviders(<HrTile name="Test" bpm={100} percentMax={55} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: #9ca3af`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText('#9ca3af')}`
    )
  })
})
