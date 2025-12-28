// hooks/useCookie.ts
import { useState, useCallback, useEffect } from 'react'
import logger from '@/utils/logger'
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf'

const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match && match[2] ? decodeURIComponent(match[2]) : undefined
}

const setCookie = (name: string, value: string, days = 365) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    document.cookie = `${name}=${encodeURIComponent(
      value
    )}; expires=${expires}; path=/; SameSite=Lax${secure}`
  }
}

function useCookie<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = getCookie(key)
    try {
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.error({ error }, 'Failed to parse cookie')
      return initialValue
    }
  })

  useEffect(() => {
    const csrfToken = getCookie(CSRF_COOKIE_NAME)
    if (!csrfToken) {
      setCookie(CSRF_COOKIE_NAME, generateCsrfToken())
    }
  }, [])

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value
        setStoredValue(valueToStore)
        setCookie(key, JSON.stringify(valueToStore))
      } catch (error) {
        logger.error({ error }, 'Failed to set cookie')
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}

export const getCsrfToken = () => getCookie(CSRF_COOKIE_NAME)

export default useCookie
