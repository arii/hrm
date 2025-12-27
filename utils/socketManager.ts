// utils/SocketManager.ts
import { WebSocketServer, WebSocket } from 'ws'
// A simple UUID generator to avoid the ESM issues with the uuid package
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
import { HrmDataRepository } from '@/lib/repositories/HrmDataRepository'
import { HrmStreamData } from '@/types'
import { IncomingMessage } from 'http'
import logger from './logger'
import { parse as urlParse } from 'url'
import { ParsedUrlQuery } from 'querystring'
import { broadcast } from './websocketUtils'

const RECONNECT_GRACE_PERIOD = 5000 // 5 seconds
const KEEP_ALIVE_INTERVAL = 30000 // 30 seconds

interface ExtWebSocket extends WebSocket {
  isAlive: boolean
  clientId: string
}

export class SocketManager {
  private wss: WebSocketServer
  private hrmDataRepository: HrmDataRepository
  private disconnectionTimers = new Map<string, NodeJS.Timeout>()

  constructor(wss: WebSocketServer) {
    this.wss = wss
    this.hrmDataRepository = new HrmDataRepository()

    this.initialize()
  }

  private initialize() {
    this.wss.on('connection', this.handleConnection.bind(this))
    const interval = setInterval(
      this.pingClients.bind(this),
      KEEP_ALIVE_INTERVAL
    )
    this.wss.on('close', () => clearInterval(interval))
  }

  private pingClients() {
    this.wss.clients.forEach((ws) => {
      const extWs = ws as ExtWebSocket
      if (!extWs.isAlive) {
        logger.warn(
          { clientId: extWs.clientId },
          'Terminating unresponsive client'
        )
        return extWs.terminate()
      }
      extWs.isAlive = false
      extWs.ping(() => {})
    })
  }

  private handleConnection(ws: ExtWebSocket, req: IncomingMessage) {
    const queryParams = this.getQueryParams(req.url)
    const clientId = (queryParams.clientId as string) || `user-${uuidv4()}`
    ws.clientId = clientId

    ws.isAlive = true
    ws.on('pong', () => {
      ws.isAlive = true
    })

    const existingClient = this.hrmDataRepository.findById(clientId);
    if (!existingClient) {
        this.hrmDataRepository.save({
        clientId,
        value: 0,
        age: 30, // Default age
        maxHr: 185, // Default max HR
        calories: 0,
        isConnected: true,
        });
        this.broadcastState();
    }

    ws.on('message', (message) => this.handleMessage(ws, message))
    ws.on('close', () => this.handleDisconnection(ws.clientId))
  }

  private handleDisconnection(clientId: string) {
    const clientData = this.hrmDataRepository.findById(clientId)
    if (clientData) {
      clientData.isConnected = false
      clientData.value = 0
      this.hrmDataRepository.save(clientData)
      this.broadcastState()

      const timer = setTimeout(() => {
        this.hrmDataRepository.deleteById(clientId)
        this.broadcastState()
        logger.info(
          { clientId },
          'Permanently removed client after grace period.'
        )
      }, RECONNECT_GRACE_PERIOD)
      this.disconnectionTimers.set(clientId, timer)
    }
  }

  private handleMessage(ws: ExtWebSocket, message: any) {
    try {
      const parsedMessage = JSON.parse(message.toString())
      const { type, data } = parsedMessage
      const clientId = ws.clientId

      switch (type) {
        case 'HRM_INPUT':
          const hrmData = this.hrmDataRepository.findById(clientId)
          if (hrmData) {
            hrmData.value = data.value
            this.hrmDataRepository.save(hrmData)
          }
          break
        case 'HRM_METADATA_UPDATE':
          this.handleMetadataUpdate(clientId, data)
          break
        // ... other message types
      }
      this.broadcastState()
    } catch (error) {
      logger.error({ error }, 'Failed to handle incoming websocket message')
    }
  }

  private handleMetadataUpdate(clientId: string, data: Partial<HrmStreamData>) {
    const existingData = this.hrmDataRepository.findById(clientId)
    if (!existingData) {
      logger.warn({ clientId }, 'Received metadata for non-existent client.')
      return
    }

    const deviceId = data.deviceId || existingData.deviceId || `fallback-device-${clientId}`
    const oldClientData = this.hrmDataRepository.findByDeviceId(deviceId)

    if (oldClientData && oldClientData.clientId !== clientId) {
      // Reclaim or terminate logic
      if (oldClientData.isConnected) {
        logger.warn(
          {
            deviceId,
            zombieClientId: oldClientData.clientId,
            newClientId: clientId,
          },
          'Terminating zombie connection and migrating state.'
        )
        this.terminateAndMigrate(oldClientData, existingData)
      } else {
        logger.info(
          {
            deviceId,
            oldClientId: oldClientData.clientId,
            newClientId: clientId,
          },
          'Reclaiming disconnected session.'
        )
        const oldTimer = this.disconnectionTimers.get(oldClientData.clientId)
        if (oldTimer) {
          clearTimeout(oldTimer)
          this.disconnectionTimers.delete(oldClientData.clientId)
        }
        this.hrmDataRepository.deleteById(oldClientData.clientId)
      }
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value !== null)
    )

    this.hrmDataRepository.save({
      ...existingData,
      ...updateData,
      deviceId,
      isConnected: true,
    })
  }

  private terminateAndMigrate(zombieData: HrmStreamData, newData: HrmStreamData) {
    // Find the WebSocket connection for the zombie client and terminate it
    this.wss.clients.forEach((client) => {
      const extWs = client as ExtWebSocket
      if (extWs.clientId === zombieData.clientId) {
        extWs.terminate()
      }
    })

    // Migrate relevant data
    newData.age = zombieData.age ?? 30;
    newData.maxHr = zombieData.maxHr ?? 185;

    // Delete the old record
    this.hrmDataRepository.deleteById(zombieData.clientId);
  }

  public broadcastState() {
    const hrmData = this.hrmDataRepository.findAll()
    const state = {
      type: 'HRM_UPDATE' as const,
      payload: hrmData,
    }
    broadcast(this.wss, state)
  }

  private getQueryParams(url?: string): ParsedUrlQuery {
    if (!url) return {}
    const parsedUrl = urlParse(url, true)
    return parsedUrl.query
  }
}

let socketManager: SocketManager

export const initializeSocketManager = (
  wss: WebSocketServer
) => {
  if (!socketManager) {
    socketManager = new SocketManager(wss)
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
