/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ZONE_COLORS } from '@/utils/visualization'
import theme from '@/lib/theme'

// Mock the getHrZoneProps function to control the test cases
jest.mock('@/utils/visualization', () => ({
  ...jest.requireActual('@/utils/visualization'),
  getHrZoneProps: (percentMax: number) => {
    let backgroundColor = ZONE_COLORS.grey
    if (percentMax >= 90) {
      backgroundColor = ZONE_COLORS.red
    } else if (percentMax >= 80) {
      backgroundColor = ZONE_COLORS.yellow
    } else if (percentMax >= 70) {
      backgroundColor = ZONE_COLORS.green
    } else if (percentMax >= 60) {
      backgroundColor = ZONE_COLORS.blue
    }
    const textColor = theme.palette.getContrastText(backgroundColor)
    return {
      backgroundColor,
      textColor,
      percentage: percentMax,
    }
  },
}))

describe('HrTile', () => {
  it('renders the correct background and text color for the Peak zone', () => {
    render(<HrTile name="Test" bpm={180} percentMax={95} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${ZONE_COLORS.red}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(ZONE_COLORS.red)}`
    )
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    render(<HrTile name="Test" bpm={160} percentMax={85} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${ZONE_COLORS.yellow}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(ZONE_COLORS.yellow)}`
    )
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    render(<HrTile name="Test" bpm={140} percentMax={75} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${ZONE_COLORS.green}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(ZONE_COLORS.green)}`
    )
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    render(<HrTile name="Test" bpm={120} percentMax={65} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${ZONE_COLORS.blue}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(ZONE_COLORS.blue)}`
    )
  })

  it('renders the correct background and text color for the low-intensity zone', () => {
    render(<HrTile name="Test" bpm={100} percentMax={55} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${ZONE_COLORS.grey}`)
    expect(card).toHaveStyle(
      `color: ${theme.palette.getContrastText(ZONE_COLORS.grey)}`
    )
  })
})
