import logger from './logger'

export const requestWakeLock = async () => {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      const wakeLock = await navigator.wakeLock.request('screen')
      logger.info('Screen Wake Lock active')
      return wakeLock
    } catch (err) {
      logger.error({ err }, 'Wake Lock request failed')
    }
  }
  return null
}
