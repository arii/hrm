/**
 * @jest-environment jsdom
 */
// File: tests/unit/components/WorkoutDataDisplay.test.tsx
import { render, screen } from '@testing-library/react'
import WorkoutDataDisplay from '@/components/WorkoutDataDisplay'
import '@testing-library/jest-dom'

describe('WorkoutDataDisplay', () => {
  it('should render the calories and duration', () => {
    render(<WorkoutDataDisplay calories={123} duration="01:30" />)
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('kcal')).toBeInTheDocument()
    expect(screen.getByText('01:30')).toBeInTheDocument()
  })
})
