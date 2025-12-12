/**
 * File: app/client/connect/page.tsx
 * Refactored to use modular view components.
 */
'use client'

import { Container } from '@mui/material'
import { useState, useCallback } from 'react'
import BottomNavBar from '../../../components/BottomNavBar'
import useBluetoothHRM from '../../../hooks/useBluetoothHRM'
import { useWebSocket } from '@/context/WebSocketContext'
import { getHrZoneProps } from '../../../utils/visualization'
import useAutoConnect from '../../../hooks/useAutoConnect'
import UnsupportedBrowserView from './components/UnsupportedBrowserView'
import ConnectedView from './components/ConnectedView'
import DisconnectedView from './components/DisconnectedView'

// --- Helper Functions ---
const setCookie = (name: string, value: string, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`
}

const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || ''
  return ''
}

export default function ConnectPage() {
  // State
  const [userName, setUserName] = useState(() => getCookie('hrm_user_name'))
  const [userAge, setUserAge] = useState(() => getCookie('hrm_user_age'))

  // Hooks
  const { connectionStatus, hrmData } = useWebSocket()
  const {
    connectAndStream,
    disconnect,
    forgetDevice,
    deviceStatus,
    isConnected,
    isSupported,
  } = useBluetoothHRM()

  // --- Effects ---
  const autoConnectFn = useCallback(async () => {
    if (userName && userAge) {
      return await connectAndStream(userName, userAge)
    }
    return false
  }, [connectAndStream, userName, userAge])

  const shouldStartAutoConnect =
    !!getCookie('hrm_device_id') &&
    connectionStatus === 'Connected' &&
    !isConnected &&
    !!userName &&
    !!userAge

  const { isConnecting: isAutoConnecting, attempts: autoConnectAttempts } =
    useAutoConnect(autoConnectFn, shouldStartAutoConnect)

  // --- Handlers ---
  const handleConnect = async () => {
    if (!userName.trim()) return alert('Please enter your name')
    const ageNum = parseInt(userAge)
    if (!userAge.trim() || ageNum < 1 || ageNum > 120)
      return alert('Invalid age')

    setCookie('hrm_user_name', userName.trim())
    setCookie('hrm_user_age', userAge.trim())
    await connectAndStream(userName, userAge)
  }

  const handleDisconnect = () => {
    disconnect()
    window.location.reload()
  }

  const handleForgetDevice = async () => {
    if (
      confirm(
        "Are you sure you want to forget this device? This will revoke the browser's permission and you will need to re-pair it."
      )
    ) {
      await forgetDevice()
      window.location.reload()
    }
  }

  // --- Data Derived ---
  const currentUserData = hrmData.find(
    (user) => user.name === userName || user.name?.includes('Bluetooth HRM')
  )
  const currentHR = currentUserData?.value || 0
  const maxHr = 220 - (parseInt(userAge) || 30)
  const hrZoneProps = getHrZoneProps(currentHR, maxHr)

  if (!isSupported) {
    return <UnsupportedBrowserView />
  }

  return (
    <>
      <Container
        maxWidth="sm"
        sx={{
          py: 3,
          pb: 12,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {isConnected ? (
          <ConnectedView
            userName={userName}
            userAge={userAge}
            currentHR={currentHR}
            hrZoneProps={hrZoneProps}
            connectionStatus={connectionStatus}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <DisconnectedView
            userName={userName}
            userAge={userAge}
            onUserNameChange={setUserName}
            onUserAgeChange={setUserAge}
            onConnect={handleConnect}
            onForgetDevice={handleForgetDevice}
            isAutoConnecting={isAutoConnecting}
            autoConnectAttempts={autoConnectAttempts}
            deviceStatus={deviceStatus}
            connectionStatus={connectionStatus}
          />
        )}
      </Container>
      <BottomNavBar />
    </>
  )
}
