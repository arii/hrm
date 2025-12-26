/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import '@testing-library/jest-dom'
import { getHrZoneUiPropsMap } from '@/utils/visualization'
import theme from '@/lib/theme'

describe('HrTile', () => {
  const renderWithTheme = (ui: React.ReactElement) => {
    return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>)
  }

  it('renders the correct background and text color for the Peak zone', () => {
    renderWithTheme(<HrTile name="Test" bpm={180} percentMax={95} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(
      `background-color: ${zonePropsMap.Peak.bgColor}`
    )
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(zonePropsMap.Peak.bgColor)}`
    )
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    renderWithTheme(<HrTile name="Test" bpm={160} percentMax={85} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(
      `background-color: ${zonePropsMap.Cardio.bgColor}`
    )
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(zonePropsMap.Cardio.bgColor)}`
    )
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    renderWithTheme(<HrTile name="Test" bpm={140} percentMax={75} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(
      `background-color: ${zonePropsMap.FatBurn.bgColor}`
    )
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(zonePropsMap.FatBurn.bgColor)}`
    )
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    renderWithTheme(<HrTile name="Test" bpm={120} percentMax={65} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(
      `background-color: ${zonePropsMap.WarmUp.bgColor}`
    )
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(zonePropsMap.WarmUp.bgColor)}`
    )
  })

  it('renders the correct background and text color for the low-intensity zone', () => {
    renderWithTheme(<HrTile name="Test" bpm={100} percentMax={55} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(
      `background-color: ${zonePropsMap.NoData.bgColor}`
    )
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(zonePropsMap.NoData.bgColor)}`
    )
  })
})
