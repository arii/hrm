/**
 * @jest-environment jsdom
 */
// tests/unit/components/analytics/ZoneDistributionChart.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import ZoneDistributionChart from '@/components/analytics/ZoneDistributionChart';
import { WorkoutDataPoint } from '@/hooks/useLocalWorkoutBuffer';
import { HrZoneName } from '@/lib/shared/hr-zones';

describe('ZoneDistributionChart', () => {
  it('should render the chart with the correct data', () => {
    const data: WorkoutDataPoint[] = [
      { time: Date.now(), hr: 120, zone: HrZoneName.Cardio },
      { time: Date.now() + 1000, hr: 125, zone: HrZoneName.Cardio },
      { time: Date.now() + 2000, hr: 130, zone: HrZoneName.Peak },
    ];

    render(<ZoneDistributionChart data={data} />);

    expect(screen.getByText('Time in Heart Rate Zones')).toBeInTheDocument();
  });
});
