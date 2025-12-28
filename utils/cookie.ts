// utils/cookie.ts
import logger from '@/utils/logger'

export const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') {
    logger.warn(
      'getCookie called in a server-side context. This is not supported.'
    )
    return undefined
  }
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match && match[2] ? match[2] : undefined
}

export const setCookie = (
  name: string,
  value: string,
  days = 365,
  secure = process.env.NODE_ENV === 'production'
) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    const secureFlag = secure ? '; Secure' : ''
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`
  }
}
