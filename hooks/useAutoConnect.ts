
import { useEffect } from 'react'
import logger from '@/utils/logger'
import { useWebSocket } from '@/context/WebSocketContext'

interface UseAutoConnectProps {
  autoConnect: () => Promise<void>
  isConnected: boolean
  isSupported: boolean
}

export const useAutoConnect = ({
  autoConnect,
  isConnected,
  isSupported,
}: UseAutoConnectProps) => {
  const { connectionStatus } = useWebSocket()

  useEffect(() => {
    if (!isConnected && isSupported && connectionStatus === 'Connected') {
      logger.info('WebSocket ready, attempting auto-connect...')
      const timeout = setTimeout(() => {
        autoConnect().catch(() => {
          logger.info('Auto-connect failed, user can connect manually')
        })
      }, 100)
      return () => clearTimeout(timeout)
    }
    return undefined
  }, [connectionStatus, isConnected, isSupported, autoConnect])
}
