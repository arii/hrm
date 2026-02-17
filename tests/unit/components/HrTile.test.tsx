/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HR_ZONE_CONFIG } from '@/lib/shared/hr-zones'

describe('HrTile', () => {
  it('renders the correct background and text color for the Max zone', () => {
    // 95% -> Zone 6
    render(<HrTile name="Test" bpm={190} percentMax={95} zone="ZONE_6" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_6.color}`)
    expect(card).toHaveStyle(`color: ${HR_ZONE_CONFIG.ZONE_6.textColor}`)
  })

  it('renders the correct background and text color for the Peak zone', () => {
    // 92% -> Zone 5
    render(<HrTile name="Test" bpm={175} percentMax={92} zone="ZONE_5" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_5.color}`)
    expect(card).toHaveStyle(`color: ${HR_ZONE_CONFIG.ZONE_5.textColor}`)
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    // 85% -> Zone 4
    render(<HrTile name="Test" bpm={160} percentMax={85} zone="ZONE_4" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_4.color}`)
    expect(card).toHaveStyle(`color: ${HR_ZONE_CONFIG.ZONE_4.textColor}`)
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    // 75% -> Zone 3
    render(<HrTile name="Test" bpm={140} percentMax={75} zone="ZONE_3" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_3.color}`)
    expect(card).toHaveStyle(`color: ${HR_ZONE_CONFIG.ZONE_3.textColor}`)
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    // 65% -> Zone 2
    render(<HrTile name="Test" bpm={120} percentMax={65} zone="ZONE_2" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_2.color}`)
    expect(card).toHaveStyle(`color: ${HR_ZONE_CONFIG.ZONE_2.textColor}`)
  })

  it('renders the correct background and text color for the Recovery zone', () => {
    // 55% -> Zone 1
    render(<HrTile name="Test" bpm={100} percentMax={55} zone="ZONE_1" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_1.color}`)
    expect(card).toHaveStyle(`color: ${HR_ZONE_CONFIG.ZONE_1.textColor}`)
  })

  it('renders "---" for BPM when the value is null', () => {
    render(<HrTile name="Test" bpm={null} percentMax={0} />)
    const bpmValue = screen.getByTestId('bpm-value')
    expect(bpmValue).toHaveTextContent('---')
  })

  it('displays the correct calorie value', () => {
    render(<HrTile name="Test" bpm={120} percentMax={65} calories={123} />)
    const calorieDisplay = screen.getByText('123')
    expect(calorieDisplay).toBeInTheDocument()
  })

  it('displays 0 calories when the value is 0', () => {
    render(<HrTile name="Test" bpm={120} percentMax={65} calories={0} />)
    const calorieDisplay = screen.getByText('0')
    expect(calorieDisplay).toBeInTheDocument()
  })

  it('updates the calorie display when the prop changes', () => {
    const { rerender } = render(
      <HrTile name="Test" bpm={120} percentMax={65} calories={100} />
    )
    expect(screen.getByText('100')).toBeInTheDocument()

    rerender(<HrTile name="Test" bpm={120} percentMax={65} calories={150} />)
    expect(screen.getByText('150')).toBeInTheDocument()
  })

  it('displays the correct zone information when zone prop is provided', () => {
    render(<HrTile name="Test" bpm={190} percentMax={95} zone="ZONE_6" />)
    expect(screen.getByText('MAX')).toBeInTheDocument()
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${HR_ZONE_CONFIG.ZONE_6.color}`)
  })

  it('displays "IDLE" for zone 0', () => {
    render(<HrTile name="Test" bpm={60} percentMax={30} zone="ZONE_0" />)
    expect(screen.getByText('IDLE')).toBeInTheDocument()
  })

  it('updates aria-label to include zone information', () => {
    render(<HrTile name="Test" bpm={150} percentMax={80} zone="ZONE_4" />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveAttribute(
      'aria-label',
      'Heart rate monitor for Test: 150 beats per minute, 80% of maximum, Zone 4: Cardio'
    )
  })

  it('suppresses generic names', () => {
    const { rerender } = render(
      <HrTile name="user" bpm={100} percentMax={50} zone="ZONE_1" />
    )
    expect(screen.queryByText(/user/i)).not.toBeInTheDocument()

    rerender(<HrTile name="New User" bpm={100} percentMax={50} zone="ZONE_1" />)
    expect(screen.queryByText(/new user/i)).not.toBeInTheDocument()

    rerender(<HrTile name="Jules" bpm={100} percentMax={50} zone="ZONE_1" />)
    expect(screen.getByText('Jules')).toBeInTheDocument()
  })
})
