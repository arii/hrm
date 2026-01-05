/**
 * @jest-environment jsdom
 */
// tests/unit/components/analytics/WorkoutMetricGrid.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import WorkoutMetricGrid from '@/components/analytics/WorkoutMetricGrid';

describe('WorkoutMetricGrid', () => {
  it('should render the workout duration and calories burned', () => {
    render(<WorkoutMetricGrid workoutDuration={3661} caloriesBurned={500} />);

    expect(screen.getByText('Total Duration')).toBeInTheDocument();
    expect(screen.getByText('01:01:01')).toBeInTheDocument();
    expect(screen.getByText('Calories Burned')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });
});
