// utils/units.ts

// Weight conversion
export const kgToLbs = (kg: number): number => kg * 2.20462
export const lbsToKg = (lbs: number): number => lbs / 2.20462

// Height conversion
export const cmToFeetAndInches = (cm: number): [number, number] => {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return [feet, inches]
}

export const feetAndInchesToCm = (feet: number, inches: number): number => {
  const totalInches = feet * 12 + inches
  return totalInches * 2.54
}
