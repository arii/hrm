'use client'

import { useEffect } from 'react'
import { useWebSocketConnection } from '@/context/WebSocketContext'

/**
 * Hook that registers the client as the "Dashboard".
 * This allows the server to identify this connection as the primary display.
 */
export const useDashboardRegistration = (player: unknown | null): void => {
  const { sendData } = useWebSocketConnection()

  useEffect(() => {
    if (!player) return

    sendData({ type: 'REGISTER_CLIENT', role: 'dashboard' })
  }, [player, sendData])
}
