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
<<<<<<< HEAD
import { SpotifyPolling } from '../../services/spotify-polling'
import { SpotifyTokenManager } from '../../services/spotify-token-manager'
import TabataTimer from '../../services/tabata-timer'
import { ServerMessage } from '../../types/websocket'
||||||| 2286026
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import TabataTimer from '../../services/tabataTimer'
import { UnifiedStateMessage } from '../../types/websocket'
=======
import { SpotifyPolling } from '../../services/spotifyPolling'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'
>>>>>>> origin/leader

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock dependencies
jest.mock('../../services/spotify-token-manager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
  AccessToken: jest.fn(),
}))

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
<<<<<<< HEAD
  let broadcastedMessages: ServerMessage[]
  let broadcastFn: (data: ServerMessage) => void
||||||| 2286026
  let broadcastedMessages: Partial<UnifiedStateMessage>[]
  let broadcastFn: (data: Partial<UnifiedStateMessage>) => void
=======
  let broadcastedMessages: Partial<ServerMessage>[]
  let broadcastFn: (data: Partial<ServerMessage>) => void
>>>>>>> origin/leader
  let mockSdk: {
    player: {
       
      getCurrentlyPlayingTrack: jest.Mock<any>
       
      startResumePlayback: jest.Mock<any>
       
      pausePlayback: jest.Mock<any>
       
      skipToNext: jest.Mock<any>
       
      skipToPrevious: jest.Mock<any>
       
      transferPlayback: jest.Mock<any>
       
      setPlaybackVolume: jest.Mock<any>
       
      getAvailableDevices: jest.Mock<any>
    }
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    // Create broadcast function that collects messages
<<<<<<< HEAD
    broadcastFn = (data: ServerMessage) => {
||||||| 2286026
    broadcastFn = (data: Partial<UnifiedStateMessage>) => {
=======
    broadcastFn = (data: Partial<ServerMessage>) => {
>>>>>>> origin/leader
      broadcastedMessages.push(data)
    }

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

    tabataTimer = new TabataTimer(broadcastFn)
    // Initialize service (which will trigger async token load)
    spotifyService = await SpotifyPolling.create(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    if (spotifyService) {
      spotifyService.stopPolling()
      spotifyService.cleanup()
    }
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', () => {
      broadcastedMessages = []
      tabataTimer.setMode('STOPWATCH')
<<<<<<< HEAD
      const lastMessage = broadcastedMessages.at(-1)
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.mode).toBe('STOPWATCH')
      }
||||||| 2286026
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.mode).toBe('STOPWATCH')
=======
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.mode).toBe('STOPWATCH')
>>>>>>> origin/leader
    })

    it('should broadcast timer state when mode changes to TABATA', () => {
      tabataTimer.setMode('STOPWATCH')
      broadcastedMessages = []
      tabataTimer.setMode('TABATA')
<<<<<<< HEAD
      const lastMessage = broadcastedMessages.at(-1)
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.mode).toBe('TABATA')
      }
||||||| 2286026
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.mode).toBe('TABATA')
=======
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.mode).toBe('TABATA')
>>>>>>> origin/leader
    })

    it('should broadcast timer state when work duration changes', () => {
      broadcastedMessages = []
      tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
<<<<<<< HEAD
      const lastMessage = broadcastedMessages.at(-1)
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.workDuration).toBe(45)
      }
||||||| 2286026
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.workDuration).toBe(45)
=======
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.workDuration).toBe(45)
>>>>>>> origin/leader
    })

    it('should broadcast timer state when rest duration changes', () => {
      broadcastedMessages = []
      tabataTimer.setConfig({ workDuration: 20, restDuration: 12 })
<<<<<<< HEAD
      const lastMessage = broadcastedMessages.at(-1)
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.restDuration).toBe(12)
      }
||||||| 2286026
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.restDuration).toBe(12)
=======
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.restDuration).toBe(12)
>>>>>>> origin/leader
    })

    it('should broadcast timer state when timer starts', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
<<<<<<< HEAD
      const lastMessage = broadcastedMessages.at(-1)
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(true)
        expect(lastMessage.payload.currentPhase).toBe('PREPARE')
      }
||||||| 2286026
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.isRunning).toBe(true)
      expect(lastMessage?.timerData?.currentPhase).toBe('PREPARE')
=======
      const timerUpdate = broadcastedMessages.find(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdate?.payload?.isRunning).toBe(true)
      expect(timerUpdate?.payload?.currentPhase).toBe('PREPARE')
>>>>>>> origin/leader
    })

    it('should broadcast timer state during phase transitions', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
<<<<<<< HEAD
      const phases = broadcastedMessages.map((m) => {
        if (m.type === 'TIMER_UPDATE') {
          return m.payload.currentPhase
        }
      })
||||||| 2286026
      const phases = broadcastedMessages.map((m) => m.timerData?.currentPhase)
=======
      const phases = broadcastedMessages
        .filter((m) => m.type === 'TIMER_UPDATE')
        .map((m) => m.payload?.currentPhase)
>>>>>>> origin/leader
      expect(phases).toEqual(expect.arrayContaining(['PREPARE', 'WORK']))
    })

    it('should broadcast timer state every second while running', () => {
      broadcastedMessages = []
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(3000)
<<<<<<< HEAD
      // Only check the last broadcast for isRunning
      const lastMessage = broadcastedMessages.at(-1)
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(true)
      }
||||||| 2286026
      // Only check the last broadcast for isRunning
      const lastMessage = broadcastedMessages.at(-1)
      expect(lastMessage?.timerData?.isRunning).toBe(true)
=======
      const timerUpdates = broadcastedMessages.filter(
        (msg) => msg.type === 'TIMER_UPDATE'
      )
      expect(timerUpdates.length).toBeGreaterThanOrEqual(3)
      expect(timerUpdates.at(-1)?.payload?.isRunning).toBe(true)
>>>>>>> origin/leader
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
    it('should handle beep volume through timer state', () => {
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000)

<<<<<<< HEAD
      const broadcasts = broadcastedMessages.filter(
        (m) => m.type === 'TIMER_UPDATE' && m.payload.soundToPlay
      )
||||||| 2286026
      const broadcasts = broadcastedMessages.filter(
        (m) => m.timerData?.soundToPlay
      )
=======
      const broadcasts = broadcastedMessages
        .filter((m) => m.type === 'TIMER_UPDATE' && m.payload?.soundToPlay)
        .map((m) => m.payload)
>>>>>>> origin/leader

      expect(broadcasts.length).toBeGreaterThan(0)
<<<<<<< HEAD
      if (broadcasts[0].type === 'TIMER_UPDATE') {
        expect(broadcasts[0].payload.soundEventId).toBeGreaterThan(0)
      }
||||||| 2286026
      expect(broadcasts[0].timerData?.soundEventId).toBeGreaterThan(0)
=======
      expect(broadcasts[0]?.soundEventId).toBeGreaterThan(0)
>>>>>>> origin/leader
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
      broadcastedMessages = []

      tabataTimer.setMode('STOPWATCH')
      const timerBroadcast = broadcastedMessages.find(
<<<<<<< HEAD
        (m) => m.type === 'TIMER_UPDATE' && m.payload.mode === 'STOPWATCH'
||||||| 2286026
        (m) => m.timerData?.mode === 'STOPWATCH'
=======
        (m) => m.type === 'TIMER_UPDATE' && m.payload?.mode === 'STOPWATCH'
>>>>>>> origin/leader
      )

      expect(timerBroadcast).toBeDefined()
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', () => {
      broadcastedMessages = []

      // Configure timer
      tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })

      // Start timer
      tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST

<<<<<<< HEAD
      const phases = broadcastedMessages.map((m) => {
        if (m.type === 'TIMER_UPDATE') {
          return m.payload.currentPhase
        }
      })
||||||| 2286026
      const phases = broadcastedMessages.map((m) => m.timerData?.currentPhase)
=======
      const phases = broadcastedMessages
        .filter((m) => m.type === 'TIMER_UPDATE')
        .map((m) => m.payload?.currentPhase)
>>>>>>> origin/leader

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
