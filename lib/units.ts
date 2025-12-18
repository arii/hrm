// lib/units.ts
export type Unit = 'metric' | 'imperial'

// Weight
export const kgToLbs = (kg: number) => kg * 2.20462
export const lbsToKg = (lbs: number) => lbs / 2.20462

// Height
export const cmToInches = (cm: number) => cm / 2.54
export const inchesToCm = (inches: number) => inches * 2.54
