export const formatDuration = (totalSeconds: number): string => {
  const seconds = Math.floor(totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${remainingSeconds}s`
  }
  return `${minutes}m ${remainingSeconds}s`
}

export const calculateEstimatedCalories = (
  hr: number,
  age: number,
  weightKg: number,
  timeSeconds: number
): number => {
  if (hr <= 0 || timeSeconds <= 0 || weightKg <= 0) return 0
  const timeMinutes = timeSeconds / 60
  let kcalPerMinute =
    (age * 0.2017 + weightKg * 0.09036 + hr * 0.6309 - 55.0969) / 4.184
  kcalPerMinute = Math.max(0.5, kcalPerMinute)
  return Math.max(0, kcalPerMinute * timeMinutes)
}
