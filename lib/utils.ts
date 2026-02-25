/**
 * Creates an object from an array of key-value pairs, filtering out entries
 * where the value is null or undefined. This is useful for cleaning up
 * objects before updating state.
 * @param entries An array of [key, value] pairs.
 * @returns A new object with the null/undefined values removed.
 */
export const objectFromEntries = <T>(
  entries: [string, T | null | undefined][]
): Record<string, T> => {
  return Object.fromEntries(
    entries.filter(([, value]) => value !== null && value !== undefined)
  ) as Record<string, T>
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param value The number to round.
 * @param decimalPlaces The number of decimal places to round to.
 * @returns The rounded number.
 */
export const roundTo = (value: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Formats a duration into a string.
 * @param duration The duration.
 * @param options The options for formatting.
 * @returns The formatted duration string.
 */
export const formatDuration = (
  duration: number,
  options: {
    unit: 'seconds' | 'milliseconds'
    format?: 'HH:MM:SS' | 'MM:SS'
    noPadMinutes?: boolean
  }
): string => {
  const { unit, format = 'HH:MM:SS', noPadMinutes = false } = options

  if (isNaN(duration) || duration < 0) {
    if (format === 'HH:MM:SS') {
      return '00:00:00'
    }
    return '00:00'
  }

  const totalSeconds =
    unit === 'milliseconds' ? Math.floor(duration / 1000) : duration

  if (format === 'MM:SS') {
    const minsRaw = Math.floor(totalSeconds / 60)
    const minutes = noPadMinutes
      ? minsRaw.toString()
      : minsRaw.toString().padStart(2, '0')
    const seconds = Math.floor(totalSeconds % 60)
      .toString()
      .padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  const h = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, '0')
  const m = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0')
  return `${h}:${m}:${s}`
}

/**
 * Formats a date using Intl.DateTimeFormat.
 * @param locale Defaults to system locale if undefined.
 */
export const formatDate = (
  date: Date | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  locale: string | undefined = undefined
): string => {
  const d = typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString(locale, options)
}

/**
 * Determines if the current environment is a test environment.
 * Checks for NODE_ENV, NEXT_PUBLIC_TESTING, and the presence of 'testing=true' in the URL.
 */
export const isTestEnvironment = (): boolean => {
  if (typeof window === 'undefined') return process.env.NODE_ENV === 'test'
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NEXT_PUBLIC_TESTING === 'true' ||
    window.location.search.includes('testing=true')
  )
}
