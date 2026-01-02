/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import theme from '@/lib/theme'
import { HrZoneName } from '@/lib/shared/hr-zones'

jest.mock('@/utils/visualization', () => ({
  getHrZoneColor: jest.fn((zoneName: HrZoneName) => {
    const mockTheme = require('@/lib/theme').default
    const colors: { [key in HrZoneName]?: string } = {
      [HrZoneName.Max]: mockTheme.palette.error.main,
      [HrZoneName.Cardio]: mockTheme.palette.warning.main,
      [HrZoneName.FatBurn]: mockTheme.palette.success.main,
      [HrZoneName.WarmUp]: mockTheme.palette.secondary.main,
      [HrZoneName.NoData]: mockTheme.palette.grey[500],
    }
    return colors[zoneName] || mockTheme.palette.grey[500]
  }),
}))

describe('HrTile', () => {
  it('renders the correct background and text color for the Peak zone', () => {
    render(<HrTile name="Test" bpm={180} percentMax={95} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.error.main}`)
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    render(<HrTile name="Test" bpm={160} percentMax={85} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.warning.main}`)
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    render(<HrTile name="Test" bpm={140} percentMax={75} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.warning.main}`)
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    render(<HrTile name="Test" bpm={120} percentMax={65} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.success.main}`)
  })

  it('renders the correct background color for zones below Warm-up', () => {
    render(<HrTile name="Test" bpm={100} percentMax={55} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.secondary.main}`)
  })

  it('renders "---" for BPM when the value is null', () => {
    render(<HrTile name="Test" bpm={null} percentMax={0} maxHr={190} />)
    const bpmValue = screen.getByTestId('bpm-value')
    expect(bpmValue).toHaveTextContent('---')
  })
})
