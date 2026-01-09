'use client'
import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '@/context/WebSocketContext'
import useBluetoothHRM from '@/hooks/useBluetoothHRM'
import { useUserSettings } from '@/context/UserSettingsContext'

type AutoConnectStatus = 'default' | 'connecting' | 'success' | 'error'

export function useAutoConnect() {
  const { isConnected } = useWebSocket()
  const [settings] = useUserSettings()
  const { connect, status } = useBluetoothHRM()
  const [autoConnectStatus, setAutoConnectStatus] =
    useState<AutoConnectStatus>('default')

  const triggerAutoConnect = useCallback(async () => {
    if (
      settings.autoConnect && // Use the new autoConnect setting
      isConnected &&
      status === 'DISCONNECTED' &&
      autoConnectStatus === 'default'
    ) {
      setAutoConnectStatus('connecting')
      try {
        // Auto-connect does not need a deviceId, as the browser remembers the last device
        await connect()
        setAutoConnectStatus('success')
      } catch (error) {
        console.error('Auto-connect failed:', error)
        setAutoConnectStatus('error')
      }
    }
  }, [
    settings.autoConnect,
    isConnected,
    status,
    autoConnectStatus,
    connect,
  ])

  useEffect(() => {
    triggerAutoConnect()
  }, [triggerAutoConnect])

  return { autoConnectStatus, setAutoConnectStatus }
}
