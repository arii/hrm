// hooks/useCookie.ts
import { useState, useCallback, useEffect } from 'react'
import logger from '@/utils/logger'
import { generateCsrfToken, CSRF_COOKIE_NAME } from '@/lib/csrf'

export const getCookie = (name: string): string | undefined => {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match && match[2] ? match[2] : undefined
}

export const setCookie = (
  name: string,
  value: string,
  days = 365,
  secure = process.env.NODE_ENV === 'production' // Stricter secure flag
) => {
  if (typeof document !== 'undefined') {
    const expires = new Date(Date.now() + days * 864e5).toUTCString()
    const secureFlag = secure ? '; Secure' : ''
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax${secureFlag}`
  }
}

function useCookie<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getCookie(key)
      if (!item) return initialValue

      return JSON.parse(decodeURIComponent(item))
    } catch (error) {
      logger.warn(
        { key, error },
        'Failed to parse cookie value. Using initial value.'
      )
      // If parsing fails, remove the malformed cookie
      if (typeof document !== 'undefined') {
        document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      }
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

        if (valueToStore === null || valueToStore === undefined) {
          // Remove the cookie if the value is null or undefined
          if (typeof document !== 'undefined') {
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          }
        } else {
          setCookie(key, encodeURIComponent(JSON.stringify(valueToStore)))
        }
      } catch (error) {
        logger.error({ key, error }, 'Failed to set cookie.')
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue] as const
}

export const getCsrfToken = () => getCookie(CSRF_COOKIE_NAME)

export default useCookie
