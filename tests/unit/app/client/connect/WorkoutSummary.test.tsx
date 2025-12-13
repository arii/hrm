/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import WorkoutSummary from '../../../../../app/client/connect/WorkoutSummary'
import {
  CALORIES_LABEL,
  DURATION_LABEL,
  WORKOUT_SUMMARY_TITLE,
} from '../../../../../constants/ui'

describe('WorkoutSummary', () => {
  it('should render the duration and calories burned', () => {
    render(<WorkoutSummary duration="01:23:45" caloriesBurned="345" />)
    expect(screen.getByText(WORKOUT_SUMMARY_TITLE)).toBeInTheDocument()
    expect(screen.getByText(DURATION_LABEL)).toBeInTheDocument()
    expect(screen.getByText('01:23:45')).toBeInTheDocument()
    expect(screen.getByText(CALORIES_LABEL)).toBeInTheDocument()
    expect(screen.getByText('345')).toBeInTheDocument()
  })

  it('should display "---" for calories when the value is "0"', () => {
    render(<WorkoutSummary duration="00:00:00" caloriesBurned="0" />)
    expect(screen.getByText('---')).toBeInTheDocument()
  })

  it('should render icons with aria-hidden="true"', () => {
    const { container } = render(
      <WorkoutSummary duration="01:23:45" caloriesBurned="345" />
    )
    const icons = container.querySelectorAll('svg')
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })
})
