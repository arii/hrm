// File: utils/formatters.ts
/**
 * Formats a duration in milliseconds to a MM:SS string.
 * @param ms The duration in milliseconds.
 * @returns A string in MM:SS format.
 */
export const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Formats a number of calories to a string with one decimal place.
 * @param calories The number of calories.
 * @returns A string representing the calories with one decimal place.
 */
export const formatCalories = (calories: number): string => {
  return calories.toFixed(1)
}
