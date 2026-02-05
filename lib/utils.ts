export const objectFromEntries = <T>(
  entries: [string, T | null | undefined][]
): Record<string, T> => {
  return Object.fromEntries(
    entries.filter(([, value]) => value !== null && value !== undefined)
  ) as Record<string, T>
}

export const roundTo = (value: number, decimalPlaces: number): number => {
  const factor = Math.pow(10, decimalPlaces)
  return Math.round((value + Number.EPSILON) * factor) / factor
}

export const formatDuration = (
  duration: number,
  options: {
    unit: 'seconds' | 'milliseconds'
    format?: 'HH:MM:SS' | 'MM:SS'
  }
): string => {
  const { unit, format = 'HH:MM:SS' } = options

  if (isNaN(duration) || duration < 0) {
    if (format === 'HH:MM:SS') {
      return '00:00:00'
    }
    return '00:00'
  }

  const totalSeconds =
    unit === 'milliseconds' ? Math.floor(duration / 1000) : duration

  if (format === 'MM:SS') {
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, '0')
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

export const formatDate = (
  date: Date | number,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
  locale: string = 'en-US'
): string => {
  const d = typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString(locale, options)
}

export const getStatusColor = (
  status: 'idle' | 'running' | 'paused' | 'finished' | string
): 'success' | 'warning' | 'primary' | 'default' => {
  switch (status) {
    case 'running':
      return 'success'
    case 'paused':
      return 'warning'
    case 'finished':
      return 'primary'
    default:
      return 'default'
  }
}
