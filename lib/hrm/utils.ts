// lib/hrm/utils.ts

/**
 * Estimates a user's maximum heart rate using the Tanaka formula.
 * @param age - The user's age in years.
 * @returns The estimated maximum heart rate.
 */
export const estimateMaxHr = (age: number): number => {
  return 208 - 0.7 * age;
};
