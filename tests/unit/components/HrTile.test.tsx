/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '../../test-utils'
import '@testing-library/jest-dom'

describe('HrTile', () => {
  it('renders the correct background and text color for the Peak zone', () => {
    render(<HrTile name="Test" bpm={180} percentMax={95} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: #1976d2`)
    expect(card).toHaveStyle(`color: #fff`)
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    render(<HrTile name="Test" bpm={160} percentMax={85} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: #f57c00`)
    expect(card).toHaveStyle(`color: #fff`)
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    render(<HrTile name="Test" bpm={140} percentMax={75} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: #388e3c`)
    expect(card).toHaveStyle(`color: #fff`)
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    render(<HrTile name="Test" bpm={120} percentMax={65} maxHr={190} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: #dc004e`)
    expect(card).toHaveStyle(`color: #fff`)
  })
})
