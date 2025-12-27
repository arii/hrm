// utils/validation.ts

export const validate = (
  value: string,
  min: number,
  max: number,
  name: string
) => {
  if (!value || value.trim() === '') {
    return null
  }
  const num = Number(value)
  if (isNaN(num) || num < min || num > max) {
    return `Please enter a valid ${name} (${min}-${max})`
  }
  return null
}
