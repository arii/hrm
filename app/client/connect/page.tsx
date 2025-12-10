'use client'

import { useCallback, useEffect, useState } from 'react'
import useAutoConnect from '../../../hooks/useAutoConnect'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'
import { API_DEBUG_RESET } from '@/constants/apiEndpoints'
import ConnectView from './ConnectView'
import { getCsrfToken } from 'next-auth/react'

// Cookie helpers
const setCookie = (name: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`
}

const getCookie = (name: string): string => {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name && parts[1] ? decodeURIComponent(parts[1]) : r
  }, '')
}

export default function ConnectPage() {
  const [userName, setUserName] = useState('')
  const [userAge, setUserAge] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const { connectionStatus, hrmData } = useWebSocket()

  const {
    connectAndStream,
    disconnect,
    deviceStatus,
    batteryLevel,
    isConnected: bluetoothConnected,
  } = useBluetoothHRM()
  const [startAutoConnect, setStartAutoConnect] = useState(false)

  const connectFn = useCallback(() => {
    const savedName = getCookie('hrm_user_name')
    const savedAge = getCookie('hrm_user_age')
    return connectAndStream(savedName, savedAge)
  }, [connectAndStream])

  useAutoConnect(connectFn, startAutoConnect)

  // Load saved values from cookies on mount and auto-connect if available
  useEffect(() => {
    const savedName = getCookie('hrm_user_name')
    const savedAge = getCookie('hrm_user_age')
    const savedDeviceId = getCookie('hrm_device_id')
    if (savedName) setUserName(savedName)
    if (savedAge) setUserAge(savedAge)

    // Auto-connect only once when WebSocket first connects and we're not already connected
    if (
      savedName &&
      savedAge &&
      savedDeviceId &&
      connectionStatus === 'Connected' &&
      !bluetoothConnected
    ) {
      setStartAutoConnect(true)
    }
  }, [connectionStatus, bluetoothConnected, connectFn])

  // Signal when page is ready for testing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.__TEST_READY__ = true
        window.dispatchEvent(new CustomEvent('test-ready'))
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    setIsConnected(bluetoothConnected)
  }, [bluetoothConnected])

  const handleConnect = async () => {
    if (!userName.trim()) {
      alert('Please enter your name')
      return
    }
    if (!userAge.trim() || parseInt(userAge) < 1 || parseInt(userAge) > 120) {
      alert('Please enter a valid age (1-120)')
      return
    }
    // Save to cookies
    setCookie('hrm_user_name', userName.trim())
    setCookie('hrm_user_age', userAge.trim())
    await connectAndStream(userName, userAge)
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    disconnect()
  }

  const handleResetServer = async () => {
    if (
      confirm(
        'Are you sure you want to reset the server? This will clear stored Spotify tokens and local device/user data.'
      )
    ) {
      try {
        // Clear client-side cookies
        document.cookie =
          'hrm_user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie =
          'hrm_user_age=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        document.cookie =
          'hrm_device_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'

        // Also clear local storage if used
        localStorage.clear()

        const csrfToken = await getCsrfToken()
        const response = await fetch(API_DEBUG_RESET, {
          method: 'POST',
          body: JSON.stringify({ csrfToken }),
          headers: {
            'Content-Type': 'application/json',
          },
        })
        const data = await response.json()
        alert(data.message)
        window.location.reload() // Reload to reflect changes
      } catch (error) {
        console.error('Error resetting server:', error)
        alert('Failed to reset server.')
      }
    }
  }

  // Find current user's heart rate data from WebSocket
  const currentUserData = hrmData.find(
    (user) =>
      user.name === userName ||
      (user.name?.includes('Bluetooth HRM') && hrmData.length === 1)
  )
  const currentHR = currentUserData?.value || 0
  const maxHr = 220 - (parseInt(userAge) || 30)
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  return (
    <ConnectView
      userName={userName}
      setUserName={setUserName}
      userAge={userAge}
      setUserAge={setUserAge}
      isConnected={isConnected}
      deviceStatus={deviceStatus}
      batteryLevel={batteryLevel}
      onConnect={handleConnect}
      onDisconnect={handleDisconnect}
      onResetServer={handleResetServer}
      currentHR={currentHR}
      hrZoneProps={hrZoneProps}
      connectionStatus={connectionStatus}
      bluetoothConnected={bluetoothConnected}
    />
  )
}
