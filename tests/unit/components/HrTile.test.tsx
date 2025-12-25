/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import theme from '@/lib/theme'

// Mock the getHrZoneProps function to control the test cases
jest.mock('@/utils/visualization', () => ({
  ...jest.requireActual('@/utils/visualization'),
  getHrZoneProps: (
    percentMax: number,
    zone: number,
    bpm: number
  ): object => {
    return {
      backgroundColor: '#000000',
      textColor: '#FFFFFF',
      percentage: percentMax,
      bpm: bpm,
      zone: zone,
    }
  },
}))

describe('HrTile', () => {
  it('renders the correct background and text color', () => {
    render(<HrTile name="Test" bpm={180} percentMax={95} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: #000000`)
    expect(card).toHaveStyle(`color: #FFFFFF`)
  })
})
