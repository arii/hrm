/**
 * @jest-environment jsdom
 */
// tests/unit/components/HrTile.test.tsx
import { jest } from '@jest/globals'
import HrTile from '@/components/HrTile'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { HR_ZONE_VISUAL_CONFIG, HrZoneName } from '@/lib/shared/hr-zones'

describe('HrTile', () => {
  it('renders the correct background and text color for the Peak zone', () => {
    const config = HR_ZONE_VISUAL_CONFIG[HrZoneName.Peak]
    render(<HrTile name="Test" bpm={180} percentMax={90} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${config.color}`)
    expect(card).toHaveStyle(`color: ${config.textColor}`)
  })

  it('renders the correct background and text color for the Cardio zone', () => {
    const config = HR_ZONE_VISUAL_CONFIG[HrZoneName.Cardio]
    render(<HrTile name="Test" bpm={160} percentMax={75} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${config.color}`)
    expect(card).toHaveStyle(`color: ${config.textColor}`)
  })

  it('renders the correct background and text color for the Fat Burn zone', () => {
    const config = HR_ZONE_VISUAL_CONFIG[HrZoneName.FatBurn]
    render(<HrTile name="Test" bpm={140} percentMax={65} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${config.color}`)
    expect(card).toHaveStyle(`color: ${config.textColor}`)
  })

  it('renders the correct background and text color for the Warm-up zone', () => {
    const config = HR_ZONE_VISUAL_CONFIG[HrZoneName.WarmUp]
    render(<HrTile name="Test" bpm={120} percentMax={55} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${config.color}`)
    expect(card).toHaveStyle(`color: ${config.textColor}`)
  })

  it('renders the correct background and text color for the Resting zone', () => {
    const config = HR_ZONE_VISUAL_CONFIG[HrZoneName.Resting]
    render(<HrTile name="Test" bpm={100} percentMax={40} />)
    const card = screen.getByTestId('hr-tile-card')
    expect(card).toHaveStyle(`background-color: ${config.color}`)
    expect(card).toHaveStyle(`color: ${config.textColor}`)
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
})
