
export const mockEstimateCaloriesBurned = jest.fn();

jest.mock('@/lib/calorie-estimation', () => ({
    ...jest.requireActual('@/lib/calorie-estimation'),
    estimateCaloriesBurned: mockEstimateCaloriesBurned,
}));
