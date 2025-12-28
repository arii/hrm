// utils/SocketManager.ts
import { randomUUID } from 'crypto'
import { WebSocketServer, WebSocket } from 'ws'
import { HrmDataRepository } from '@/lib/repositories/HrmDataRepository'
import { HrmStreamData } from '@/types'
import { IncomingMessage } from 'http'
import logger from './logger'
import { parse as urlParse } from 'url'
import { ParsedUrlQuery } from 'querystring'
import { broadcast } from './websocketUtils'
import {
  WebSocketMessageSchema,
  HrmInputSchema,
  HrmMetadataUpdateSchema,
  HrmMetadataUpdate,
} from '@/lib/validation/ws-schemas'

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
    const clientId = (queryParams.clientId as string) || `user-${randomUUID()}`
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
      const parsedJson = JSON.parse(message.toString())
      const messageValidation = WebSocketMessageSchema.safeParse(parsedJson)

      if (!messageValidation.success) {
        this.sendError(ws, 'Invalid message structure', messageValidation.error)
        return
      }

      const { type, data } = messageValidation.data
      const clientId = ws.clientId

      switch (type) {
        case 'HRM_INPUT': {
          const hrmInputValidation = HrmInputSchema.safeParse(data)
          if (!hrmInputValidation.success) {
            this.sendError(ws, 'Invalid HRM_INPUT data', hrmInputValidation.error)
            return
          }
          const hrmData = this.hrmDataRepository.findById(clientId)
          if (hrmData) {
            hrmData.value = hrmInputValidation.data.value
            this.hrmDataRepository.save(hrmData)
          }
          break
        }
        case 'HRM_METADATA_UPDATE': {
          const metadataValidation = HrmMetadataUpdateSchema.safeParse(data)
          if (!metadataValidation.success) {
            this.sendError(
              ws,
              'Invalid HRM_METADATA_UPDATE data',
              metadataValidation.error
            )
            return
          }
          this.handleMetadataUpdate(clientId, metadataValidation.data)
          break
        }
      }
      this.broadcastState()
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.sendError(ws, 'Invalid JSON format', error.message)
      } else {
        logger.error({ error }, 'Failed to handle incoming websocket message')
        this.sendError(
          ws,
          'An unexpected server error occurred',
          (error as Error).message
        )
      }
    }
  }

  private handleMetadataUpdate(clientId: string, data: HrmMetadataUpdate) {
    const existingData = this.hrmDataRepository.findById(clientId)
    if (!existingData) {
      logger.warn({ clientId }, 'Received metadata for non-existent client.')
      return
    }

    const deviceId =
      data.deviceId || existingData.deviceId || `fallback-device-${clientId}`
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
        // MIGRATION: Copy important state from the old session
        existingData.calories = oldClientData.calories

        const oldTimer = this.disconnectionTimers.get(oldClientData.clientId)
        if (oldTimer) {
          logger.debug(
            { clientId: oldClientData.clientId },
            'Cleared disconnection timer for reclaimed session.'
          )
          clearTimeout(oldTimer)
          this.disconnectionTimers.delete(oldClientData.clientId)
        }
        this.hrmDataRepository.deleteById(oldClientData.clientId)
      }
    }

    this.hrmDataRepository.save({
      ...existingData,
      ...data,
      deviceId,
      isConnected: true,
    })
  }

  private terminateAndMigrate(
    zombieData: HrmStreamData,
    newData: HrmStreamData
  ) {
    let zombieWsFound = false
    // Find the WebSocket connection for the zombie client and terminate it
    this.wss.clients.forEach((client) => {
      const extWs = client as ExtWebSocket
      if (extWs.clientId === zombieData.clientId) {
        logger.info(
          { clientId: zombieData.clientId },
          'Terminating zombie WebSocket connection.'
        )
        extWs.terminate()
        zombieWsFound = true
      }
    })

    if (!zombieWsFound) {
      logger.warn(
        { clientId: zombieData.clientId },
        'Could not find the WebSocket connection to terminate for zombie client.'
      )
    }

    // Migrate relevant data
    logger.debug(
      {
        fromClientId: zombieData.clientId,
        toClientId: newData.clientId,
        migratedData: { age: zombieData.age, maxHr: zombieData.maxHr },
      },
      'Migrating data from zombie to new client.'
    )
    newData.age = zombieData.age ?? 30
    newData.maxHr = zombieData.maxHr ?? 185
    newData.calories = zombieData.calories

    // Delete the old record
    this.hrmDataRepository.deleteById(zombieData.clientId)
  }

  private sendError(ws: WebSocket, message: string, details: any) {
    const errorResponse = {
      type: 'ERROR',
      payload: {
        message,
        details,
      },
    }
    logger.warn(
      { clientId: (ws as ExtWebSocket).clientId, ...errorResponse.payload },
      'Sending error to client'
    )
    ws.send(JSON.stringify(errorResponse))
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
