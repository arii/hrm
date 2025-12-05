'use client'
import { createContext, ReactNode, useCallback, useContext } from 'react'
import { useConnection } from '../hooks/useConnection'
import { useAppState } from './AppStateContext'
import { ClientCommandMessage } from '@/types/websocket'

interface ConnectionContextType {
  connectionStatus: string
  sendData: (data: ClientCommandMessage) => void
  connect: () => void
  disconnect: () => void
}

const ConnectionContext = createContext<ConnectionContextType | null>(null)

export const ConnectionProvider = ({
  children,
  serverUrl,
}: {
  children: ReactNode
  serverUrl?: string
}) => {
  const { dispatch } = useAppState()
  const { connectionStatus, sendData, connect, disconnect } = useConnection(
    dispatch,
    serverUrl
  )

  const contextValue = {
    connectionStatus,
    sendData,
    connect,
    disconnect,
  }

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}

export const useConnectionManager = () => {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error(
      'useConnectionManager must be used within a ConnectionProvider'
    )
  }
  return context
}
