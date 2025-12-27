// utils/validation.ts
export const validate = (
  value: string,
  min: number,
  max: number,
  fieldName: string
): string | null => {
  if (!value) {
    return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required.`
  }
  const numValue = Number(value)
  if (isNaN(numValue) || numValue < min || numValue > max) {
    return `Please enter a valid ${fieldName} between ${min} and ${max}.`
  }
  return null
}

export const isNumeric = (
  value: string,
  options?: { allowFloat?: boolean }
): boolean => {
  if (options?.allowFloat) {
    return /^\d*\.?\d*$/.test(value)
  }
  return /^\d*$/.test(value)
}
