// hooks/useCookie.ts
'use client'
import { useState, useEffect } from 'react'
import { getCookie, setCookie as setBrowserCookie } from '@/utils/cookie'
import logger from '@/utils/logger'

async function setSecureCookie(name: string, value: any) {
  try {
    const response = await fetch('/api/cookie', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        value,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        },
      }),
    })
    if (!response.ok) {
      throw new Error('Failed to set secure cookie')
    }
  } catch (error) {
    logger.error('Error setting secure cookie via API:', error)
  }
}

function useCookie<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }
    try {
      const item = getCookie(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      logger.error(error)
      return initialValue
    }
  })

  useEffect(() => {
    try {
      const item = getCookie(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      logger.error('Error parsing cookie on mount:', error)
    }
  }, [key])

  const setValue = (value: T) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        if (value === null || value === undefined) {
          setBrowserCookie(key, '', { maxAge: -1 }) // Delete cookie
          setSecureCookie(key, '') // Ask server to delete as well
        } else {
          const stringifiedValue = JSON.stringify(valueToStore)
          setBrowserCookie(key, stringifiedValue) // For immediate client-side access
          setSecureCookie(key, stringifiedValue) // For secure, persistent storage
        }
      }
    } catch (error) {
      logger.error('Error setting cookie:', error)
    }
  }

  return [storedValue, setValue]
}

export default useCookie
