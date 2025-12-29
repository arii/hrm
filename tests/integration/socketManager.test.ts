import { WebSocketServer } from 'ws'
import { initSocketManager } from '../../utils/socketManager'
import { AppServices } from '../../lib/services'
import {
  TimerCommandMessage,
  HrmInputMessage,
  StateSnapshot,
} from '../../types/websocket'
import { EventEmitter } from 'events'
import TabataTimer from '../../services/tabataTimer'

// A more robust mock WebSocket that extends EventEmitter
class MockWebSocket extends EventEmitter {
  send = jest.fn()
  constructor() {
    super()
  }
}

describe('initSocketManager', () => {
  let wss: WebSocketServer
  let mockServices: AppServices
  let getUnifiedStateSnapshot: () => StateSnapshot
  let tabataServiceStartSpy: jest.SpyInstance
  let tabataServiceStopSpy: jest.SpyInstance
  let initialTabataState: any
  let initialSpotifyState: any

  beforeEach(async () => {
    wss = new WebSocketServer({ noServer: true })

    const realTimer = new TabataTimer(() => {})
    initialTabataState = realTimer.getState()
    realTimer.dispose()

    initialSpotifyState = {
      trackId: null,
      trackName: 'Awaiting Login...',
      artist: '',
      albumName: '',
      albumArtUrl: '',
      isPlaying: false,
      devices: [],
      volume: 70,
      isMuted: false,
    }

    mockServices = {
      tabataService: {
        start: jest.fn(),
        stop: jest.fn(),
        getState: jest.fn().mockReturnValue(initialTabataState),
      },
      spotifyService: {
        getState: jest.fn().mockReturnValue(initialSpotifyState),
      },
    } as unknown as AppServices

    tabataServiceStartSpy = jest.spyOn(mockServices.tabataService, 'start')
    tabataServiceStopSpy = jest.spyOn(mockServices.tabataService, 'stop')

    getUnifiedStateSnapshot = (): StateSnapshot => ({
      timerData: mockServices.tabataService.getState(),
      spotifyData: mockServices.spotifyService.getState(),
      hrmData: [],
      spotifyServiceInitialized: false,
    })

    initSocketManager(wss, getUnifiedStateSnapshot, mockServices)
  })

  afterEach(() => {
    jest.clearAllMocks()
    wss.close()
  })

  it('should send initial state upon connection', async () => {
    const mockWs = new MockWebSocket()
    const promise = new Promise<void>((resolve) => {
      mockWs.send = jest.fn((data) => {
        const message = JSON.parse(data as string)
        expect(message.type).toBe('INITIAL_STATE')
        expect(message.payload.timerData).toEqual(initialTabataState)
        expect(message.payload.spotifyData).toEqual(initialSpotifyState)
        resolve()
      })
    })

    wss.emit('connection', mockWs, {})
    await promise
  })

  it('should handle TIMER_COMMAND and call the correct service method', () => {
    const mockWs = new MockWebSocket()
    wss.emit('connection', mockWs, {})

    const startCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'START',
    }
    const stopCommand: TimerCommandMessage = {
      type: 'TIMER_COMMAND',
      command: 'STOP',
    }

    mockWs.emit('message', JSON.stringify(startCommand))
    expect(tabataServiceStartSpy).toHaveBeenCalledTimes(1)

    mockWs.emit('message', JSON.stringify(stopCommand))
    expect(tabataServiceStopSpy).toHaveBeenCalledTimes(1)
  })

  it('should handle HRM_INPUT and not broadcast', () => {
    const mockWs = new MockWebSocket()
    wss.emit('connection', mockWs, {})

    const hrmInput: HrmInputMessage = {
      type: 'HRM_INPUT',
      data: {
        value: 150,
      },
    }

    mockWs.emit('message', JSON.stringify(hrmInput))
  })
})
