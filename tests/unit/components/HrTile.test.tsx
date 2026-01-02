/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { render, screen } from '@testing-library/react'
import HrTile from '@/components/HrTile'
import '@testing-library/jest-dom'
import theme from '@/lib/theme'

describe('HrTile', () => {
  it('renders the correct background and text color for the Peak zone', () => {
    render(<HrTile name="Test" bpm={180} percentMax={95} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${theme.palette.error.dark}`)
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
