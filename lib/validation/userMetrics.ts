import { MeasurementSystem } from '../../types/core'

export const WEIGHT_VALIDATION = {
  IMPERIAL: { min: 66, max: 440 }, // lbs
  METRIC: { min: 30, max: 200 }, // kg
}

export const validateHeightValue = (
  cm: number,
  unitSystem: MeasurementSystem
) => {
  if (isNaN(cm) || cm < 100 || cm > 250) {
    if (unitSystem === 'METRIC') {
      return 'Please enter a valid height (100-250 cm)'
    } else {
      return 'Please enter a valid height (3ft 3in - 8ft 2in)'
    }
  }
  return null
}

export const validateAgeValue = (age: string) => {
  if (!age || age.trim() === '') return null
  const num = Number(age)
  if (isNaN(num) || num < 1 || num > 120) {
    return 'Please enter a valid age (1-120)'
  }
  return null
}

export const validateWeightValue = (
  weight: string,
  unit: MeasurementSystem
) => {
  if (!weight || weight.trim() === '') return null
  const num = Number(weight)
  const range = WEIGHT_VALIDATION[unit]
  if (isNaN(num) || num < range.min || num > range.max) {
    return `Please enter a valid weight (${range.min}-${range.max})`
  }
  return null
}
