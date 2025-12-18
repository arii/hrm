// utils/units.ts

// Weight conversion
export const kgToLbs = (kg: number): number => kg * 2.20462
export const lbsToKg = (lbs: number): number => lbs / 2.20462

// Height conversion
export const cmToFeet = (cm: number): number => cm / 30.48
export const feetToCm = (feet: number): number => feet * 30.48
