/**
 * Unit tests for WebSocket manager
 * Tests state broadcasting and command routing through services
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'
import { Server } from 'ws'
import { SpotifyPolling } from '../../services/spotifyPolling'
import TabataTimer from '../../services/tabataTimer'
import { initSocketManager } from '../../utils/socketManager'

// Mock dependencies
jest.mock('../../services/tabataTimer')
jest.mock('../../services/spotifyPolling')
jest.mock('../../utils/broadcast')
jest.mock('ws')

const MockTabataTimer = TabataTimer as jest.MockedClass<typeof TabataTimer>
const MockSpotifyPolling = SpotifyPolling as jest.MockedClass<
  typeof SpotifyPolling
>

describe('WebSocket Manager', () => {
  let tabataService: jest.Mocked<TabataTimer>
  let spotifyService: jest.Mocked<SpotifyPolling>
  let mockWss: jest.Mocked<Server>
  let getSnapshot: jest.Mock

  beforeEach(() => {
    // Create mock instances of services
    tabataService = new MockTabataTimer(jest.fn()) as jest.Mocked<TabataTimer>
    spotifyService = new MockSpotifyPolling() as jest.Mocked<SpotifyPolling>

    // Mock WebSocket server
    mockWss = new Server() as jest.Mocked<Server>
    mockWss.on = jest.fn()
    mockWss.clients = new Set<any>()

    getSnapshot = jest.fn()

    // Initialize the socket manager with mocked dependencies
    initSocketManager(mockWss, { tabataService, spotifyService }, getSnapshot)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  // Helper function to simulate a client message
  const simulateMessage = (message: object) => {
    const connectionHandler = mockWss.on.mock.calls.find(
      (call) => call[0] === 'connection'
    )?.[1]
    if (!connectionHandler) {
      throw new Error('Connection handler not found')
    }
    const mockWs = {
      on: jest.fn(),
      send: jest.fn(),
      ping: jest.fn(),
    }
    connectionHandler(mockWs)
    const messageHandler = mockWs.on.mock.calls.find(
      (call) => call[0] === 'message'
    )?.[1]
    if (!messageHandler) {
      throw new Error('Message handler not found')
    }
    messageHandler(JSON.stringify(message))
    return mockWs
  }

  describe('Timer Command Routing', () => {
    it('should call tabataService.start() on START_TABATA command', () => {
      simulateMessage({ type: 'TIMER_COMMAND', command: 'START_TABATA' })
      expect(tabataService.start).toHaveBeenCalledWith(undefined)
    })

    it('should call tabataService.start() with config on START_TABATA command', () => {
      const config = { workDuration: 30, restDuration: 15, totalCycles: 10 }
      simulateMessage({
        type: 'TIMER_COMMAND',
        command: 'START_TABATA',
        config,
      })
      expect(tabataService.start).toHaveBeenCalledWith(config)
    })

    it('should call tabataService.startStopwatch() on START_STOPWATCH command', () => {
      simulateMessage({ type: 'TIMER_COMMAND', command: 'START_STOPWATCH' })
      expect(tabataService.startStopwatch).toHaveBeenCalledTimes(1)
    })

    it('should call tabataService.pause() on PAUSE command', () => {
      simulateMessage({ type: 'TIMER_COMMAND', command: 'PAUSE' })
      expect(tabataService.pause).toHaveBeenCalledTimes(1)
    })

    it('should call tabataService.stop() on STOP command', () => {
      simulateMessage({ type: 'TIMER_COMMAND', command: 'STOP' })
      expect(tabataService.stop).toHaveBeenCalledTimes(1)
    })
  })

  describe('Spotify Command Routing', () => {
    it('should call spotifyService.handleCommand on SPOTIFY_COMMAND', () => {
      const spotifyMessage = {
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'test_device',
      }
      simulateMessage(spotifyMessage)
      expect(spotifyService.handleCommand).toHaveBeenCalledWith(
        'PLAY',
        'test_device',
        undefined,
        undefined
      )
    })
  })

  describe('State Management', () => {
    it('should send initial state on GET_STATE message', () => {
      const mockSnapshot = {
        timerData: { isRunning: false },
        spotifyData: { isPlaying: false },
      }
      getSnapshot.mockReturnValue(mockSnapshot)

      const mockWs = simulateMessage({ type: 'GET_STATE' })

      expect(getSnapshot).toHaveBeenCalledTimes(1)
      expect(mockWs.send).toHaveBeenCalledTimes(1)

      // Parse the sent message and assert on its structure and content
      const receivedArg = mockWs.send.mock.calls[0][0]
      const receivedPayload = JSON.parse(receivedArg)

      expect(receivedPayload.type).toBe('INITIAL_STATE')
      expect(receivedPayload.payload.timerData).toEqual(mockSnapshot.timerData)
      expect(receivedPayload.payload.spotifyData).toEqual(
        mockSnapshot.spotifyData
      )
      expect(Array.isArray(receivedPayload.payload.hrmData)).toBe(true)
    })
  })
})
