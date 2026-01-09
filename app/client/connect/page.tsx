'use client'
import React from 'react'
import { UserSettingsProvider } from '@/context/UserSettingsContext'
import { WebSocketProvider } from '@/context/WebSocketContext'
import ConnectView from './components/ConnectView'
import BluetoothHRMProvider from '@/context/BluetoothHRMContext'

const ConnectPage: React.FC = () => {
  return (
    <WebSocketProvider>
      <UserSettingsProvider>
        <BluetoothHRMProvider>
          <ConnectView />
        </BluetoothHRMProvider>
      </UserSettingsProvider>
    </WebSocketProvider>
  )
}

export default ConnectPage
