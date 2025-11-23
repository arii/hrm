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
import { UnifiedStateMessage } from '../../types/websocket'

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

import { WebSocket, WebSocketServer } from 'ws'
import { initSocketManager } from '../../utils/socketManager'

// Mock ws server
jest.mock('ws', () => ({
  WebSocket: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
  })),
  WebSocketServer: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: new Set(),
    handleUpgrade: jest.fn((_req, _socket, _head, cb) => {
      const ws = new (jest.requireActual('ws').WebSocket)('ws://localhost:1234')
      cb(ws)
    }),
  })),
}))

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let wss: WebSocketServer
  let mockClient: WebSocket

  let mockSdk: {
    player: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getCurrentlyPlayingTrack: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      startResumePlayback: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pausePlayback: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skipToNext: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      skipToPrevious: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transferPlayback: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setPlaybackVolume: jest.Mock<any>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getAvailableDevices: jest.Mock<any>
    }
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()

    // Mock TokenManager to return a valid token
    ;(SpotifyTokenManager as unknown as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest
        .fn()
        .mockResolvedValue('test_access_token') as jest.Mock,
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }) as jest.Mock,
      stopPolling: jest.fn() as jest.Mock,
      cleanup: jest.fn() as jest.Mock,
    }))

    // Mock SDK instance
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

    // Mock SpotifyApi.withAccessToken to return our mock SDK
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue(mockSdk)

    tabataTimer = new TabataTimer()
    spotifyService = await SpotifyPolling.create()
    wss = new WebSocketServer()
    mockClient = new WebSocket('ws://localhost:1234')
    ;(wss.clients as Set<WebSocket>).add(mockClient)

    initSocketManager(wss, {
      tabataService: tabataTimer,
      spotifyService: spotifyService,
    })

    // Simulate client subscription after init
    const connectionHandler = (wss.on as jest.Mock).mock.calls.find(
      (call) => call[0] === 'connection'
    )[1]
    if (connectionHandler) {
      connectionHandler(mockClient)
      const messageHandler = (mockClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message'
      )[1]
      messageHandler(JSON.stringify({ type: 'SUBSCRIBE', topic: 'TIMER' }))
      messageHandler(JSON.stringify({ type: 'SUBSCRIBE', topic: 'SPOTIFY' }))
    }
  })

  afterEach(() => {
    jest.useRealTimers()
    if (spotifyService) {
      spotifyService.stopPolling()
      spotifyService.cleanup()
    }
    ;(wss.clients as Set<WebSocket>).clear()
  })

  describe('Dashboard Updates with Timer Changes', () => {
    beforeEach(() => {
      // Clear the initial STATE_UPDATE message before each test in this block
      ;(mockClient.send as jest.Mock).mockClear()
      const messageHandler = (mockClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message'
      )[1]
      messageHandler(JSON.stringify({ type: 'SUBSCRIBE', topic: 'TIMER' }))
    })

    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      tabataTimer.setMode('STOPWATCH')
      const lastCall = (mockClient.send as jest.Mock).mock.calls.at(-1)[0]
      const message = JSON.parse(lastCall)
      expect(message.payload.mode).toBe('STOPWATCH')
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.setMode('TABATA')
      const lastCall = (mockClient.send as jest.Mock).mock.calls.at(-1)[0]
      const message = JSON.parse(lastCall)
      expect(message.payload.mode).toBe('TABATA')
    })

    it('should broadcast timer state when work duration changes', () => {
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      const lastCall = (mockClient.send as jest.Mock).mock.calls.at(-1)[0]
      const message = JSON.parse(lastCall)
      expect(message.payload.workDuration).toBe(45)
    })

    it('should broadcast timer state when rest duration changes', () => {
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
      const lastCall = (mockClient.send as jest.Mock).mock.calls.at(-1)[0]
      const message = JSON.parse(lastCall)
      expect(message.payload.restDuration).toBe(12)
    })

    it('should broadcast timer state when timer starts', () => {
      tabataTimer.handleCommand('START')
      const lastCall = (mockClient.send as jest.Mock).mock.calls.at(-1)[0]
      const message = JSON.parse(lastCall)
      expect(message.payload.isRunning).toBe(true)
      expect(message.payload.currentPhase).toBe('PREPARE')
    })

    it('should broadcast timer state every second while running', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
      const lastCall = (mockClient.send as jest.Mock).mock.calls.at(-1)[0]
      const message = JSON.parse(lastCall)
      expect(message.payload.isRunning).toBe(true)
    })
  })

  describe('State-Dependent UI Updates', () => {
    it('should indicate timer as inactive when in IDLE phase', () => {
      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })

    it('should indicate timer as active after START command', () => {
      tabataTimer.handleCommand('START')

      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
    })

    it('should indicate timer as inactive after PAUSE command', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)

      tabataTimer.handleCommand('PAUSE')

      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(false)
    })

    it('should indicate timer as inactive after STOP command', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)

      tabataTimer.handleCommand('STOP')

      const state = tabataTimer.getState()
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })
  })

  describe('Volume Changes', () => {
    beforeEach(() => {
      ;(mockClient.send as jest.Mock).mockClear()
      const messageHandler = (mockClient.on as jest.Mock).mock.calls.find(
        (call) => call[0] === 'message'
      )[1]
      messageHandler(JSON.stringify({ type: 'SUBSCRIBE', topic: 'SPOTIFY' }))
    })
    it('should handle beep volume through timer state', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000)

      const soundBroadcast = (mockClient.send as jest.Mock).mock.calls.find(
        (call) => {
          const message = JSON.parse(call[0])
          return message.payload && message.payload.soundToPlay
        }
      )

      expect(soundBroadcast).toBeDefined()
      const message = JSON.parse(soundBroadcast[0])
      expect(message.payload.soundEventId).toBeGreaterThan(0)
    })

    it('should support Spotify volume commands', async () => {
      // The service now manages SDK internally, no need to set accessToken manually if mocks are set up

      spotifyService.handleCommand('SET_VOLUME', undefined, 75)

      // Verify mock called
      expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalled()
    })
  })

  describe('Service Integration', () => {
    it('should maintain separate timer and Spotify state', async () => {
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')

      const timerState = tabataTimer.getState()
      const spotifyState = spotifyService.getState()

      expect(timerState.mode).toBe('STOPWATCH')
      expect(timerState.isRunning).toBe(true)
      expect(spotifyState).toHaveProperty('trackName')
      expect(spotifyState).toHaveProperty('isPlaying')
    })

    it('should allow timer and Spotify commands independently', async () => {
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.startResumePlayback).toHaveBeenCalled()
    })

    it('should broadcast updates from both services', () => {
      ;(mockClient.send as jest.Mock).mockClear()
      tabataTimer.setMode('STOPWATCH')
      const timerBroadcast = (mockClient.send as jest.Mock).mock.calls.find(
        (call) => JSON.parse(call[0]).type === 'TIMER_UPDATE'
      )
      expect(timerBroadcast).toBeDefined()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      // Configure timer
      tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })

      // Start timer
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST

      const phases = (mockClient.send as jest.Mock).mock.calls
        .map((call) => {
          const message = JSON.parse(call[0])
          return message.payload ? message.payload.currentPhase : null
        })
        .filter(Boolean)

      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
      expect(phases).toContain('REST')
    })

    it('should maintain state consistency across multiple operations', () => {
      // Multiple operations
      tabataTimer.setMode('STOPWATCH')
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('PAUSE')
      tabataTimer.setMode('TABATA')

      const state = tabataTimer.getState()

      // Should end in consistent state
      expect(state.mode).toBe('TABATA')
      expect(state.isRunning).toBe(false)
      expect(state.currentPhase).toBe('IDLE')
    })

    it('should support timer start with Spotify skip command', async () => {
      tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.skipToNext).toHaveBeenCalled()
    })

    it('should support timer stop with Spotify pause command', async () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      tabataTimer.handleCommand('STOP')
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      const timerState = tabataTimer.getState()
      expect(timerState.isRunning).toBe(false)
      expect(mockSdk.player.pausePlayback).toHaveBeenCalled()
    })
  })
})
