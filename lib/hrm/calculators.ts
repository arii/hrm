/**
 * Calculates the estimated Maximum Heart Rate using the Tanaka Equation.
 * Formula: 208 - (0.7 * age)
 * * @see http://www.onlinejacc.org/content/37/1/153
 */
export const calculateMaxHr = (age: number): number => {
  if (!age || age <= 0) return 190 // Fallback default
  return Math.round(208 - (0.7 * age))
}

/**
 * Calculates the target heart rate for a specific intensity percentage.
 */
export const calculateTargetHr = (maxHr: number, percentage: number): number => {
  return Math.round(maxHr * (percentage / 100))
}
