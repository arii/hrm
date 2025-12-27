// utils/socketManager.ts
import { WebSocketServer } from 'ws'
import { SocketManager }  from './SocketManager'
import { AppServices } from '@/types'

let socketManager: SocketManager

export const initializeSocketManager = (
  wss: WebSocketServer,
  services: AppServices
) => {
  if (!socketManager) {
    socketManager = new SocketManager(wss, services)
  }
  return socketManager
}

// Export a function to get the instance, ensuring it's initialized first.
export const getSocketManager = (): SocketManager => {
  if (!socketManager) {
    throw new Error('SocketManager has not been initialized.')
  }
  return socketManager
}
