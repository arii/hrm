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
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock dependencies
jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

import { RawData, WebSocket } from 'ws'
import {
  ClientMessage,
  ServerMessage,
  TimerState,
  UnifiedStateMessage,
} from '../../types/websocket'
import { initSocketManager } from '../../utils/socketManager'

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let wsSendMock: jest.Mock<any>
  let mockSdk: any
  let clientSendMessage: (message: ClientMessage) => void

  // All tests in this suite now share the same server and client instances
  // to more accurately reflect the application's runtime behavior.
  beforeAll(async () => {
    jest.useFakeTimers()
    jest.resetModules() // Essential for proper module isolation

    // Use await import for ES module compatibility
    const { initSocketManager } = await import('../../utils/socketManager')
    const { SpotifyPolling } = await import('../../services/spotifyPolling')
    const { SpotifyTokenManager } = await import(
      '../../services/spotifyTokenManager'
    )
    const TabataTimer = (await import('../../services/tabataTimer')).default
    const { WebSocketServer } = await import('ws')
    const { IncomingMessage } = await import('http')

    // 1. Mock WebSocketServer and client
    const wssMock = new WebSocketServer({ noServer: true })
    wsSendMock = jest.fn()
    const wsMock = {
      on: jest.fn(),
      send: wsSendMock,
      readyState: WebSocket.OPEN,
    } as unknown as WebSocket

    // Capture the message handler when ws.on('message', handler) is called
    let messageHandler: (message: RawData, isBinary: boolean) => void =
      () => {}
    ;(wsMock.on as jest.Mock).mockImplementation(
      (event: string, handler: any) => {
        if (event === 'message') {
          messageHandler = handler
        }
      }
    )

    clientSendMessage = (message: ClientMessage) => {
      const messageString = JSON.stringify(message)
      if (messageHandler) {
        messageHandler(messageString, false)
      } else {
        throw new Error(
          'Message handler not registered on mock WebSocket client.'
        )
      }
    }

    // 2. Mock service dependencies
    jest.mock('../../services/spotifyTokenManager')
    ;(SpotifyTokenManager as unknown as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest.fn().mockResolvedValue('test_access_token'),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }),
    }))
    mockSdk = {
      player: {
        getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
        startResumePlayback: jest.fn().mockResolvedValue(undefined),
        pausePlayback: jest.fn().mockResolvedValue(undefined),
        skipToNext: jest.fn().mockResolvedValue(undefined),
        skipToPrevious: jest.fn().mockResolvedValue(undefined),
        transferPlayback: jest.fn().mockResolvedValue(undefined),
        setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
        getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
      },
    }
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

    // 3. Initialize services
    tabataTimer = new TabataTimer(jest.fn())
    spotifyService = await SpotifyPolling.create(jest.fn())

    const getUnifiedStateSnapshot = (
      clientHrmData?: Partial<HrmData>
    ): Partial<UnifiedStateMessage> => ({
      type: 'STATE_UPDATE',
      payload: {
        spotifyServiceInitialized: true,
        timerData: tabataTimer.getState(),
        spotifyData: spotifyService.getState(),
        hrmData: clientHrmData,
      },
    })

    // 4. Initialize socket manager and simulate a client connection
    initSocketManager(wssMock, {
      tabataService: tabataTimer,
      spotifyService: spotifyService,
      getUnifiedStateSnapshot,
    })
    wssMock.emit('connection', wsMock, {} as IncomingMessage)
  })

  beforeEach(() => {
    // Clear mocks and reset any state between tests
    wsSendMock.mockClear()
    // Reset timer to a known initial state before each test
    tabataTimer.handleCommand('STOP')
    // Reset the singleton wssInstance in broadcast.ts
    const { __TEST_ONLY_reset_wss_instance } = require('../../utils/broadcast')
    __TEST_ONLY_reset_wss_instance()
  })

  afterEach(() => {
    // No longer need to call useRealTimers here as it's handled in afterAll
    if (spotifyService) {
      spotifyService.stopPolling()
    }
  })

  afterAll(() => {
    jest.useRealTimers()
    if (spotifyService) {
      spotifyService.cleanup()
    }
  })

  describe('Connection and Identification', () => {
    it('should send initial state snapshot upon connection', () => {
      // The connection is simulated in beforeAll. The first action is a state push.
      expect(wsSendMock).toHaveBeenCalledTimes(1)
      const message = JSON.parse(wsSendMock.mock.calls[0][0])
      expect(message.type).toBe('STATE_UPDATE')
      expect(message.payload).toHaveProperty('timerData')
    })

    it('should handle the IDENTIFY message and associate data', () => {
      clientSendMessage({
        type: 'IDENTIFY',
        payload: {
          userId: 'test-user',
          encryptedRefreshToken: 'test-token',
        },
      })
      // Further actions would be needed to verify token handling,
      // but for now, we just confirm the message is processed without error.
      expect(wsSendMock).toHaveBeenCalledTimes(1) // No new message sent on IDENTIFY
    })
  })

  describe('Timer Commands', () => {
    it('should handle TIMER_COMMAND for START', () => {
      clientSendMessage({ type: 'TIMER_COMMAND', command: 'START' })
      jest.advanceTimersByTime(1000) // Let timer tick once

      const lastCall = wsSendMock.mock.calls.at(-1)
      const lastMessage = JSON.parse(lastCall[0]) as ServerMessage

      expect(lastMessage.type).toBe('TIMER_UPDATE')
      expect(lastMessage.payload.isRunning).toBe(true)
      expect(lastMessage.payload.currentPhase).toBe('PREPARE')
    })

    it('should handle TIMER_COMMAND for PAUSE', () => {
      // Start the timer first
      clientSendMessage({ type: 'TIMER_COMMAND', command: 'START' })
      wsSendMock.mockClear()

      // Then pause it
      clientSendMessage({ type: 'TIMER_COMMAND', command: 'PAUSE' })
      const lastCall = wsSendMock.mock.calls.at(-1)
      const lastMessage = JSON.parse(lastCall[0]) as ServerMessage

      expect(lastMessage.type).toBe('TIMER_UPDATE')
      expect(lastMessage.payload.isRunning).toBe(false)
    })

    it('should handle SET_TIMER_CONFIG command', () => {
      clientSendMessage({
        type: 'SET_TIMER_CONFIG',
        config: { workDuration: 45, restDuration: 15, rounds: 10 },
      })

      const lastCall = wsSendMock.mock.calls.at(-1)
      const lastMessage = JSON.parse(lastCall[0]) as ServerMessage

      expect(lastMessage.type).toBe('TIMER_UPDATE')
      expect(lastMessage.payload.workDuration).toBe(45)
      expect(lastMessage.payload.restDuration).toBe(15)
    })
  })

  describe('Spotify Commands', () => {
    it('should handle SPOTIFY_COMMAND for PLAY', () => {
      clientSendMessage({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'test_device',
      })
      expect(mockSdk.player.startResumePlayback).toHaveBeenCalledWith(
        'test_device',
        undefined
      )
    })

    it('should handle SPOTIFY_COMMAND for PAUSE', () => {
      clientSendMessage({ type: 'SPOTIFY_COMMAND', command: 'PAUSE' })
      expect(mockSdk.player.pausePlayback).toHaveBeenCalled()
    })

    it('should handle SPOTIFY_COMMAND for NEXT', () => {
      clientSendMessage({ type: 'SPOTIFY_COMMAND', command: 'NEXT' })
      expect(mockSdk.player.skipToNext).toHaveBeenCalled()
    })

    it('should handle SPOTIFY_COMMAND for SET_VOLUME', () => {
      clientSendMessage({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        volume: 75,
      })
      expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(75)
    })

    it('should trigger spotify NEXT when timer starts', () => {
      clientSendMessage({
        type: 'TIMER_COMMAND',
        command: 'START',
        deviceId: 'test_device_for_timer',
      })

      expect(mockSdk.player.skipToNext).toHaveBeenCalledWith(
        'test_device_for_timer'
      )
    })

    it('should trigger spotify PAUSE when timer stops', () => {
      clientSendMessage({
        type: 'TIMER_COMMAND',
        command: 'STOP',
        deviceId: 'test_device_for_timer',
      })

      expect(mockSdk.player.pausePlayback).toHaveBeenCalledWith(
        'test_device_for_timer'
      )
    })
  })

  describe('HRM Data Handling', () => {
    it('should receive HRM_INPUT and broadcast HRM_UPDATE', () => {
      wsSendMock.mockClear() // Clear the initial connection message
      const hrmData = {
        value: 120,
        maxHr: 190,
        restingHr: 60,
        userAge: 30,
        userName: 'Test User',
      }
      clientSendMessage({ type: 'HRM_INPUT', payload: hrmData })

      // A new broadcast should be sent
      expect(wsSendMock).toHaveBeenCalledTimes(1)
      const lastCall = wsSendMock.mock.calls.at(-1)
      const lastMessage = JSON.parse(lastCall[0]) as ServerMessage

      expect(lastMessage.type).toBe('HRM_UPDATE')
      expect(lastMessage.payload.heartRate).toBe(120)
      expect(lastMessage.payload.zone).toBe('Anaerobic')
    })
  })
})
