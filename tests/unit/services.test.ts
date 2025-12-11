/**
 * Unit tests for services
 * Tests state broadcasting and command routing through services
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import { TabataTimer } from '../../services/tabataTimer'
import { SpotifyPolling } from '../../services/spotifyPolling'
import { ServerMessage } from '../../types/websocket'
import { SpotifyApi } from '@spotify/web-api-ts-sdk'
import { SpotifyTokenManager } from '../../services/spotifyTokenManager'

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

describe('Services Integration', () => {
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
    ;(SpotifyTokenManager as jest.Mock).mockImplementation(() => ({
      getValidAccessToken: jest.fn().mockResolvedValue('test_access_token'),
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }),
      stopPolling: jest.fn(),
      cleanup: jest.fn(),
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

    tabataTimer = await TabataTimer.create(broadcastFn)
    spotifyService = await SpotifyPolling.create(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.stopPolling()
    spotifyService.cleanup()
    tabataTimer.dispose()
  })

  describe('Dashboard Updates with Timer Changes', () => {
    it('should broadcast timer state when mode changes to STOPWATCH', async () => {
      broadcastedMessages = []
      await tabataTimer.setMode('STOPWATCH')
      const lastMessage = broadcastedMessages.pop()
      expect(lastMessage?.type).toBe('TIMER_UPDATE')
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.mode).toBe('STOPWATCH')
      }
    })

    it('should broadcast timer state when work duration changes', async () => {
      broadcastedMessages = []
      await tabataTimer.setConfig({ workDuration: 45, restDuration: 15 })
      const lastMessage = broadcastedMessages.pop()
      expect(lastMessage?.type).toBe('TIMER_UPDATE')
      if (lastMessage?.type === 'TIMER_UPDATE') {
        expect(lastMessage.payload.workDuration).toBe(45)
      }
    })

    it('should broadcast timer state during phase transitions', async () => {
      await tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // Complete PREPARE phase
      const phases = broadcastedMessages
        .map((m) => (m.type === 'TIMER_UPDATE' ? m.payload.currentPhase : null))
        .filter(Boolean)
      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
    })
  })

  describe('State-Dependent UI Updates', () => {
    it('should indicate timer as active after START command', async () => {
      await tabataTimer.handleCommand('START')
      const state = tabataTimer.getTimerData()
      expect(state.isRunning).toBe(true)
      expect(state.currentPhase).toBe('PREPARE')
    })

    it('should indicate timer as inactive after PAUSE command', async () => {
      await tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(2000)
      await tabataTimer.handleCommand('PAUSE')
      const state = tabataTimer.getTimerData()
      expect(state.isRunning).toBe(false)
    })
  })

  describe('Complete Workflow Integration', () => {
    it('should handle complete workout workflow', async () => {
      await tabataTimer.setConfig({ workDuration: 30, restDuration: 10 })
      await tabataTimer.handleCommand('START')
      jest.advanceTimersByTime(5000) // PREPARE
      jest.advanceTimersByTime(30000) // WORK
      jest.advanceTimersByTime(10000) // REST
      const phases = broadcastedMessages
        .map((m) => (m.type === 'TIMER_UPDATE' ? m.payload.currentPhase : null))
        .filter(Boolean)
      expect(phases).toContain('PREPARE')
      expect(phases).toContain('WORK')
      expect(phases).toContain('REST')
    })

    it('should support timer start with Spotify skip command', async () => {
      await tabataTimer.handleCommand('START')
      await spotifyService.handleCommand('NEXT', 'test_device_id')
      const timerState = tabataTimer.getTimerData()
      expect(timerState.isRunning).toBe(true)
      expect(mockSdk.player.skipToNext).toHaveBeenCalled()
    })
  })
})
