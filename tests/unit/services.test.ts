/**
 * Unit tests for service integrations, focusing on state broadcasting and command routing.
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import TabataTimer from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ServerMessage } from '../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

jest.mock('../../services/spotifyTokenManager')
jest.mock('@spotify/web-api-ts-sdk', () => ({
  SpotifyApi: {
    withAccessToken: jest.fn(),
  },
}))

describe('Services Integration Tests', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: ServerMessage[]
  let broadcastFn: (message: ServerMessage) => void
  let mockSdk: {
    player: {
      getCurrentlyPlayingTrack: jest.Mock
      startResumePlayback: jest.Mock
      pausePlayback: jest.Mock
      skipToNext: jest.Mock
      skipToPrevious: jest.Mock
      transferPlayback: jest.Mock
      setPlaybackVolume: jest.Mock
      getAvailableDevices: jest.Mock
    }
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    broadcastFn = (message: ServerMessage) => {
      broadcastedMessages.push(message)
    }

    // Mock TokenManager to provide a valid token for SDK initialization
    ;(SpotifyTokenManager as jest.Mock).mockImplementation(() => ({
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }),
    }))

    // Mock the Spotify SDK player methods
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

    // Initialize services
    tabataTimer = new TabataTimer(broadcastFn)
    spotifyService = await SpotifyPolling.create(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.cleanup() // Use cleanup method for consistency
  })

  describe('TabataTimer Command Handling', () => {
    it('should start the timer in TABATA mode and broadcast PREPARE phase', () => {
      tabataTimer.start()
      jest.advanceTimersByTime(200) // Allow one tick to pass

      expect(broadcastedMessages.length).toBeGreaterThan(0)
      const lastMessage = broadcastedMessages.pop()
      expect(lastMessage?.type).toBe('TIMER_UPDATE')
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(true)
        expect(lastMessage.payload.mode).toBe('TABATA')
        expect(lastMessage.payload.currentPhase).toBe('PREPARE')
      }
    })

    it('should start the timer in STOPWATCH mode', () => {
      tabataTimer.startStopwatch()
      jest.advanceTimersByTime(200)

      const lastMessage = broadcastedMessages.pop()
      expect(lastMessage?.type).toBe('TIMER_UPDATE')
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(true)
        expect(lastMessage.payload.mode).toBe('STOPWATCH')
      }
    })

    it('should pause a running timer', () => {
      tabataTimer.start()
      jest.advanceTimersByTime(1000)
      broadcastedMessages = [] // Clear initial messages

      tabataTimer.pause()
      const lastMessage = broadcastedMessages.pop()
      expect(lastMessage?.type).toBe('TIMER_UPDATE')
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(false)
      }
    })

    it('should stop a running timer and reset to IDLE', () => {
      tabataTimer.start()
      jest.advanceTimersByTime(1000)
      broadcastedMessages = []

      tabataTimer.stop()
      const lastMessage = broadcastedMessages.pop()
      expect(lastMessage?.type).toBe('TIMER_UPDATE')
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.isRunning).toBe(false)
        expect(lastMessage.payload.mode).toBe('IDLE')
        expect(lastMessage.payload.currentPhase).toBe('IDLE')
      }
    })

    it('should transition from PREPARE to WORK phase', () => {
      tabataTimer.start()
      jest.advanceTimersByTime(5200) // 5s PREPARE + 1 tick

      const phases = broadcastedMessages.map((m) =>
        m.type === 'TIMER_UPDATE' ? m.payload.currentPhase : null
      )
      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
    })
  })

  describe('SpotifyService Command Handling', () => {
    it('should handle PLAY command', async () => {
      await spotifyService.handleCommand('PLAY', 'test_device_id')
      expect(mockSdk.player.startResumePlayback).toHaveBeenCalledWith(
        'test_device_id',
        undefined,
        undefined
      )
    })

    it('should handle PAUSE command', async () => {
      await spotifyService.handleCommand('PAUSE', 'test_device_id')
      expect(mockSdk.player.pausePlayback).toHaveBeenCalledWith('test_device_id')
    })

    it('should handle SET_VOLUME command', async () => {
      await spotifyService.handleCommand('SET_VOLUME', 'test_device_id', 75)
      expect(mockSdk.player.setPlaybackVolume).toHaveBeenCalledWith(
        75,
        'test_device_id'
      )
    })
  })

  describe('Cross-Service Integration', () => {
    it('should allow timer and Spotify commands to be issued independently', async () => {
      // Start the timer
      tabataTimer.start()
      jest.advanceTimersByTime(1000)

      // Send a Spotify command
      await spotifyService.handleCommand('NEXT', 'test_device_id')

      // Check timer state
      const timerMessage = broadcastedMessages
        .slice()
        .reverse()
        .find((m) => m.type === 'TIMER_UPDATE')
      expect(timerMessage?.type).toBe('TIMER_UPDATE')
      if (timerMessage?.type === 'TIMER_UPDATE') {
        expect(timerMessage.payload.isRunning).toBe(true)
      }

      // Check that Spotify SDK was called
      expect(mockSdk.player.skipToNext).toHaveBeenCalledWith('test_device_id')
    })
  })
})
