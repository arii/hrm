// tests/unit/hooks/useCalorieTracker.test.ts
/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useCalorieTracker } from '@/hooks/useCalorieTracker';
import * as calorieEstimation from '@/lib/calorie-estimation';

// Mock the calorie estimation function
jest.mock('@/lib/calorie-estimation', () => ({
  estimateCaloriesBurned: jest.fn(),
}));

describe('useCalorieTracker', () => {
  const mockEstimateCaloriesBurned = calorieEstimation.estimateCaloriesBurned as jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    mockEstimateCaloriesBurned.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const MOCK_AGE = 30;
  const MOCK_WEIGHT_KG = 70;

  it('should initialize with zero calories and empty history', () => {
    const { result } = renderHook(() => useCalorieTracker({ age: MOCK_AGE, weightKg: MOCK_WEIGHT_KG }));

    expect(result.current.totalCaloriesBurned).toBe(0);
    expect(result.current.calorieHistory).toEqual([]);
  });

  it('should calculate and accumulate calories burned when processing heart rate', () => {
    const MOCKED_CALORIES_FOR_INTERVAL = 0.2;
    mockEstimateCaloriesBurned.mockReturnValue(MOCKED_CALORIES_FOR_INTERVAL);
    const { result } = renderHook(() => useCalorieTracker({ age: MOCK_AGE, weightKg: MOCK_WEIGHT_KG }));

    // First data point
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
      result.current.processHeartRate(150);
    });

    // Second data point 2 seconds later
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:02.000Z'));
      result.current.processHeartRate(155);
    });

    const dtSeconds = 2;
    const dtMinutes = dtSeconds / 60;

    // Check if the estimation function was called with the correct parameters
    expect(mockEstimateCaloriesBurned).toHaveBeenCalledWith({
      heartRate: 155,
      age: MOCK_AGE,
      weightKg: MOCK_WEIGHT_KG,
      durationMinutes: dtMinutes,
    });

    // The hook should accumulate the value directly returned by the mock
    expect(result.current.totalCaloriesBurned).toBeCloseTo(MOCKED_CALORIES_FOR_INTERVAL);
    expect(result.current.calorieHistory).toHaveLength(1);
    expect(result.current.calorieHistory[0]).toEqual(
        expect.objectContaining({
            hr: 155,
            caloriesPerSecond: expect.any(Number),
        })
    );
  });

  it('should not calculate calories if the time gap is too large (>10s)', () => {
    const { result } = renderHook(() => useCalorieTracker({ age: MOCK_AGE, weightKg: MOCK_WEIGHT_KG }));

    act(() => {
        jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
        result.current.processHeartRate(150);
    });

    act(() => {
        jest.setSystemTime(new Date('2023-01-01T12:00:15.000Z')); // 15s gap
        result.current.processHeartRate(155);
    });

    expect(mockEstimateCaloriesBurned).not.toHaveBeenCalled();
    expect(result.current.totalCaloriesBurned).toBe(0);
  });

  it('should reset the tracker to its initial state', () => {
    const { result } = renderHook(() => useCalorieTracker({ age: MOCK_AGE, weightKg: MOCK_WEIGHT_KG }));

    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
      result.current.processHeartRate(150);
    });
    act(() => {
      jest.setSystemTime(new Date('2023-01-01T12:00:02.000Z'));
      result.current.processHeartRate(155);
    });

    expect(result.current.totalCaloriesBurned).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.totalCaloriesBurned).toBe(0);
    expect(result.current.calorieHistory).toEqual([]);
  });
});
