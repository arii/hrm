/**
 * @jest-environment jsdom
 */
// File: tests/unit/hooks/useCalorieCounter.test.ts
import { renderHook } from '@testing-library/react';
import { useCalorieCounter } from '../../../hooks/useCalorieCounter';
import * as calorieEstimation from '../../../lib/calorie-estimation';

jest.mock('../../../lib/calorie-estimation', () => ({
  calculateCalories: jest.fn(),
}));

describe('useCalorieCounter', () => {
  it('should calculate calories correctly', () => {
    (calorieEstimation.calculateCalories as jest.Mock).mockReturnValue(1);
    const { result } = renderHook(() => useCalorieCounter(120, 30, 70));

    expect(result.current).toBe(0);
  });
});
