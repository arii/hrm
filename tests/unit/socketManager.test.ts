// File: tests/unit/socketManager.test.ts
import { jest } from '@jest/globals'
import { WebSocketServer } from 'ws'
import {
  initSocketManager,
  resetSocketManager,
} from '../../utils/socketManager'
import { serviceContainer } from '../../lib/serviceContainer'
import { MockWebSocket } from './mocks/socket'
import { SpotifyPolling } from '../../services/spotifyPolling'
import TabataTimer from '../../services/tabataTimer'

jest.mock('ws')
jest.mock('../../services/spotifyPolling')
jest.mock('../../services/tabataTimer')

describe('WebSocket Manager', () => {
  let mockWss: WebSocketServer
  let mockServices: {
    tabataService: TabataTimer
    spotifyService: SpotifyPolling
  }
  let getUnifiedStateSnapshot: jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    mockWss = new (WebSocketServer as jest.Mock)({ noServer: true })
    mockServices = {
      tabataService: new (TabataTimer as jest.Mock<TabataTimer>)(),
      spotifyService: new (SpotifyPolling as jest.Mock<SpotifyPolling>)(),
    }
    getUnifiedStateSnapshot = jest.fn()

    serviceContainer.register('tabataService', mockServices.tabataService)
    serviceContainer.register('spotifyService', mockServices.spotifyService)

    initSocketManager(mockWss, getUnifiedStateSnapshot)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
    ;(mockWss.clients as Set<MockWebSocket>).clear()
    resetSocketManager()
  })

  it('should handle new connections', () => {
    const ws = new MockWebSocket()
    mockWss.emit('connection', ws)
    expect(ws.on).toHaveBeenCalledWith('message', expect.any(Function))
    expect(ws.on).toHaveBeenCalledWith('close', expect.any(Function))
  })

  // Add more tests for the socket manager here
})
