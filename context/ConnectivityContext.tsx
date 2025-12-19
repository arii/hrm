'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { fetchWithRetry } from '../utils/fetchWithRetry'

type NetworkStatus = 'online' | 'offline' | 'limited'
interface ConnectivityContextType {
  networkStatus: NetworkStatus
  isOnline: boolean
}

const ConnectivityContext = createContext<ConnectivityContextType | null>(null)

// Configuration for the connectivity check
const PING_INTERVAL = 30000 // 30 seconds
const PING_TIMEOUT = 5000 // 5 seconds
const PING_URL = '/api/health/network-check' // Lightweight endpoint

export const ConnectivityProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  )
  const isOnline = networkStatus === 'online'
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const checkConnectivity = useCallback(async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setNetworkStatus('offline')
      return
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT)
      const response = await fetchWithRetry(PING_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeoutId)

      if (response.ok) {
        setNetworkStatus('online')
      } else {
        setNetworkStatus('limited')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('[ConnectivityProvider] Network check timed out.')
      } else {
        console.warn('[ConnectivityProvider] Network check failed:', error)
      }
      setNetworkStatus('limited')
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      console.log('[ConnectivityProvider] Browser detected online status.')
      // Don't immediately set to 'online', trigger a check to confirm real connectivity.
      checkConnectivity()
      // Start periodic checks
      pingIntervalRef.current = setInterval(checkConnectivity, PING_INTERVAL)
    }

    const handleOffline = () => {
      console.log('[ConnectivityProvider] Browser detected offline status.')
      setNetworkStatus('offline')
      // Stop periodic checks when offline
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }

    // Initial check
    handleOnline()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
    }
  }, [checkConnectivity])

  return (
    <ConnectivityContext.Provider value={{ networkStatus, isOnline }}>
      {children}
    </ConnectivityContext.Provider>
  )
}

export const useConnectivity = () => {
  const context = useContext(ConnectivityContext)
  if (!context) {
    throw new Error(
      'useConnectivity must be used within a ConnectivityProvider'
    )
  }
  return context
}
