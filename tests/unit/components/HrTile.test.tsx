
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from '@jest/globals'
import HrTile from '@/components/HrTile'
import '@testing-library/jest-dom'

describe('HrTile Component', () => {
  it('should display the floor of the calories value', () => {
    const calories = 123.789
    render(
      <HrTile
        name="Test User"
        bpm={150}
        percentMax={80}
        calories={calories}
      />
    )

    // The component should display the floored value, not the raw float.
    const calorieDisplay = screen.getByText('123')
    expect(calorieDisplay).toBeInTheDocument()

    // Also assert that the raw, unrounded value is NOT present.
    const rawCalorieDisplay = screen.queryByText('123.789')
    expect(rawCalorieDisplay).not.toBeInTheDocument()
  })
})
