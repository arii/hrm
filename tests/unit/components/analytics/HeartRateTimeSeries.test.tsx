/**
 * @jest-environment jsdom
 */
// tests/unit/components/analytics/HeartRateTimeSeries.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import HeartRateTimeSeries from '@/components/analytics/HeartRateTimeSeries';
import { WorkoutDataPoint } from '@/hooks/useLocalWorkoutBuffer';
import { HrZoneName } from '@/lib/shared/hr-zones';

describe('HeartRateTimeSeries', () => {
  it('should render the chart with the correct data', () => {
    const data: WorkoutDataPoint[] = [
      { time: Date.now(), hr: 120, zone: HrZoneName.Cardio },
      { time: Date.now() + 1000, hr: 125, zone: HrZoneName.Cardio },
    ];

    render(<HeartRateTimeSeries data={data} />);

    expect(screen.getByText('Heart Rate Over Time')).toBeInTheDocument();
  });
});
