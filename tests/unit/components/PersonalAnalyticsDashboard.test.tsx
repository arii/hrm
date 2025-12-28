/**
 * @jest-environment jsdom
 */
// File: tests/unit/components/PersonalAnalyticsDashboard.test.tsx
import React from 'react'
import { render } from '@testing-library/react'
import { PersonalAnalyticsDashboard } from '../../../components/PersonalAnalyticsDashboard'
import * as useCalorieCounter from '../../../hooks/useCalorieCounter'

jest.mock('../../../hooks/useCalorieCounter', () => ({
  useCalorieCounter: jest.fn(),
}))

describe('PersonalAnalyticsDashboard', () => {
  it('should display the calories burned', () => {
    ;(useCalorieCounter.useCalorieCounter as jest.Mock).mockReturnValue({
      calories: 100,
      resetCalories: jest.fn(),
    })
    const { getByText } = render(
      <PersonalAnalyticsDashboard heartRate={120} age={30} weight={70} />
    )

    expect(getByText('Calories Burned: 100.00')).toBeInTheDocument()
  })
})
