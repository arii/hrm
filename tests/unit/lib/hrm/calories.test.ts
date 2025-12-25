/** @jest-environment jsdom */
import { calculateCaloriesBurned } from '@/lib/hrm/calories';

describe('calculateCaloriesBurned', () => {
  it('calculates calories correctly for males', () => {
    const calories = calculateCaloriesBurned({
      heartRate: 150,
      age: 30,
      weight: 80,
      gender: 'male',
      durationSeconds: 1800,
    });
    // Calculation: ((-55.0969 + 0.6309 * 150 + 0.1988 * 80 + 0.2017 * 30) / 4.184) * 30 = 440.91
    expect(calories).toBeCloseTo(440.91, 1);
  });

  it('calculates calories correctly for females', () => {
    const calories = calculateCaloriesBurned({
      heartRate: 150,
      age: 30,
      weight: 60,
      gender: 'female',
      durationSeconds: 1800,
    });
    // Calculation: ((-20.4022 + 0.4472 * 150 - 0.1263 * 60 + 0.074 * 30) / 4.184) * 30 = 296.27
    expect(calories).toBeCloseTo(296.27, 1);
  });
});
