// tests/utils/constants.test.ts
import { calculateMaxHr, MAX_HR_DEFAULT } from '../../utils/constants';

describe('calculateMaxHr', () => {
  it('should calculate max heart rate for a valid age number', () => {
    expect(calculateMaxHr(30)).toBe(190);
  });

  it('should calculate max heart rate for a valid age string', () => {
    expect(calculateMaxHr('40')).toBe(180);
  });

  it('should return default max heart rate for null or undefined age', () => {
    expect(calculateMaxHr(null)).toBe(MAX_HR_DEFAULT);
    expect(calculateMaxHr(undefined)).toBe(MAX_HR_DEFAULT);
  });

  it('should return default max heart rate for zero age', () => {
    expect(calculateMaxHr(0)).toBe(MAX_HR_DEFAULT);
  });

  it('should return default max heart rate for a negative age', () => {
    expect(calculateMaxHr(-10)).toBe(MAX_HR_DEFAULT);
  });

  it('should return default max heart rate for a non-numeric string', () => {
    expect(calculateMaxHr('abc')).toBe(MAX_HR_DEFAULT);
  });
});
