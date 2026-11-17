// Workout headers like "20/10", "30/15x2" or "25/10 x3" name a work/rest
// interval. Anything else ("Tabata", "3 x 10", "Chipper 20/15/10") is not
// startable from the card.
const INTERVAL_HEADER = /^\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*(?:x\s*\d+\s*)?$/i

interface IntervalHeader {
  workDuration: number
  restDuration: number
}

export const parseIntervalHeader = (header: string): IntervalHeader | null => {
  const match = INTERVAL_HEADER.exec(header)
  if (!match) return null
  const workDuration = Number(match[1])
  const restDuration = Number(match[2])
  if (workDuration < 1) return null
  return { workDuration, restDuration }
}
