import baseLogger, { type Logger } from '@/utils/logger'

/**
 * In-memory connection log behind the connect page's "Copy connection log"
 * button: every Bluetooth log line plus each banner change, timestamped and
 * tagged with this tab's id, so a failed hardware test can be diagnosed
 * without DevTools. Bounded so a long session cannot grow it without limit.
 */
const MAX_ENTRIES = 300

type Level = 'debug' | 'info' | 'warn' | 'error'

interface ConnectionLogEntry {
  at: number
  level: Level
  message: string
  data?: unknown
}

const entries: ConnectionLogEntry[] = []

export const TAB_ID = Math.random().toString(36).slice(2, 8)

export const recordConnectionEvent = (
  level: Level,
  message: string,
  data?: unknown
) => {
  entries.push({ at: Date.now(), level, message, data })
  if (entries.length > MAX_ENTRIES)
    entries.splice(0, entries.length - MAX_ENTRIES)
}

const serialize = (data: unknown): string => {
  if (data === undefined) return ''
  try {
    return JSON.stringify(data, (_key, value: unknown) =>
      value instanceof Error
        ? { name: value.name, message: value.message }
        : value
    )
  } catch {
    return String(data)
  }
}

export const formatConnectionLog = (): string => {
  const header = [
    `HRM connection log, tab ${TAB_ID}`,
    `Copied ${new Date().toISOString()}`,
    typeof navigator === 'undefined' ? '' : navigator.userAgent,
  ]
  const lines = entries.map((entry) => {
    const data = serialize(entry.data)
    return `${new Date(entry.at).toISOString()} ${entry.level.toUpperCase()} ${entry.message}${data ? ` ${data}` : ''}`
  })
  return [...header, '', ...lines].join('\n')
}

export const clearConnectionLog = () => {
  entries.length = 0
}

// Logger calls use either (message) or (data, message); normalize both.
const record =
  (level: Level) =>
  (msg: string | object, ...args: unknown[]) => {
    baseLogger[level](msg, ...args)
    if (level === 'debug') return
    if (typeof msg === 'string') {
      recordConnectionEvent(level, msg, args.length ? args : undefined)
    } else {
      const text = typeof args[0] === 'string' ? args[0] : ''
      recordConnectionEvent(level, text, msg)
    }
  }

const connectionLogger: Logger = {
  debug: record('debug'),
  info: record('info'),
  warn: record('warn'),
  error: record('error'),
  child() {
    return this
  },
}

export default connectionLogger
