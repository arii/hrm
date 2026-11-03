import { MeasurementSystem } from '../../types/core'

const WEIGHT_VALIDATION = {
  IMPERIAL: { min: 66, max: 440 }, // lbs
  METRIC: { min: 30, max: 200 }, // kg
} as const

/**
 * Builds a range validator: blank input passes (optional field), otherwise
 * the value must be numeric and within [min, max]. Accepts strings (form
 * fields) or numbers (already-parsed values).
 */
export const createRangeValidator = (
  min: number,
  max: number,
  message: string
) => {
  return (value: string | number): string | null => {
    const num = typeof value === 'string' ? value.trim() : value
    if (num === '') return null
    const parsed = Number(num)
    if (isNaN(parsed) || parsed < min || parsed > max) {
      return message
    }
    return null
  }
}

const HEIGHT_VALIDATORS: Record<
  MeasurementSystem,
  (cm: number) => string | null
> = {
  METRIC: createRangeValidator(
    100,
    250,
    'Please enter a valid height (100-250 cm)'
  ),
  IMPERIAL: createRangeValidator(
    100,
    250,
    'Please enter a valid height (3ft 3in - 8ft 2in)'
  ),
}

const WEIGHT_VALIDATORS: Record<
  MeasurementSystem,
  (weight: string) => string | null
> = {
  IMPERIAL: createRangeValidator(
    WEIGHT_VALIDATION.IMPERIAL.min,
    WEIGHT_VALIDATION.IMPERIAL.max,
    `Please enter a valid weight (${WEIGHT_VALIDATION.IMPERIAL.min}-${WEIGHT_VALIDATION.IMPERIAL.max})`
  ),
  METRIC: createRangeValidator(
    WEIGHT_VALIDATION.METRIC.min,
    WEIGHT_VALIDATION.METRIC.max,
    `Please enter a valid weight (${WEIGHT_VALIDATION.METRIC.min}-${WEIGHT_VALIDATION.METRIC.max})`
  ),
}

export const validateHeightValue = (
  cm: number,
  unitSystem: MeasurementSystem
) => {
  return HEIGHT_VALIDATORS[unitSystem](cm)
}

export const validateAgeValue = createRangeValidator(
  1,
  120,
  'Please enter a valid age (1-120)'
)

export const validateWeightValue = (
  weight: string,
  unit: MeasurementSystem
) => {
  return WEIGHT_VALIDATORS[unit](weight)
}
