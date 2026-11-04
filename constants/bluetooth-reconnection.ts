/**
 * @file bluetooth-reconnection.ts
 * @description Centralized constants for Bluetooth reconnection logic.
 */

// Maximum number of times to attempt reconnection before giving up.
export const BLUETOOTH_MAX_RECONNECT_ATTEMPTS =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS
    ? parseInt(process.env.NEXT_PUBLIC_BLUETOOTH_MAX_RECONNECT_ATTEMPTS, 10)
    : 8

// Reconnection Delay Parameters
export const RECONNECT_BASE_DELAY_MS = 2000
export const RECONNECT_DELAY_INCREMENT_MS = 500
export const RECONNECT_RANDOM_DELAY_MS = 1000

// Busy-radio retries: the daemon reported contention, so back off with an
// escalating schedule instead of hammering it. First retry stays quick
// for transient contention; later ones give a wedged adapter time to
// settle. Delays before busy attempts 2, 3, 4.
export const BUSY_RETRY_DELAYS_MS = [1000, 3000, 5000]

// Quiet-strap retries for fresh connects (silent and manual): delays before
// attempts 2, 3, 4 (attempts at ~0/5/15/35s). The first radio op often
// fails fast ("no longer in range") while the adapter/strap wakes; each
// miss fails instantly, so a truly absent device costs 4 fast failures,
// not hammering. Reconnect drops keep their own backoff (no quiet retry).
export const QUIET_STRAP_RETRY_DELAYS_MS = [5000, 10000, 20000]

// Slow safety poll while waiting for a sleeping strap to reappear. The
// advertisement watcher (instant) is primary; this covers platforms
// without it and missed advertisements. Each miss fails fast.
export const ADVERTISEMENT_FALLBACK_POLL_MS = 60000

// Minimum spacing between advertisement-triggered wake attempts. Straps
// advertise ~1Hz, so without a cooldown every advertisement would fire a
// radio op; a refusing strap would spin the adapter hot. Polls (60s)
// never hit this.
export const WAKE_ATTEMPT_COOLDOWN_MS = 10000

// Failed wake attempts (advertisement or poll) before the waiting status
// names the likely blockage and the manual fix. Auto-recovery continues
// underneath; only the message gets honest.
export const WAIT_GUIDANCE_AFTER_MISSES = 3

/**
 * @param attempt - The current attempt number (starting from 1).
 * @returns The delay in milliseconds using a linear backoff strategy with jitter.
 */
export const getBackoffDelay = (attempt: number): number => {
  const increment = (attempt - 1) * RECONNECT_DELAY_INCREMENT_MS
  const jitter = Math.random() * RECONNECT_RANDOM_DELAY_MS
  return RECONNECT_BASE_DELAY_MS + increment + jitter
}
