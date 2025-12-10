/**
 * Unit tests for WebSocket manager, focusing on command routing and service integration.
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
import * as socketManager from '../../utils/socketManager'

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

describe('WebSocket Manager Integration', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: Partial<ServerMessage>[]
  let broadcastFn: (data: Partial<ServerMessage>) => void
  let mockSdkPlayer: {
    startResumePlayback: jest.Mock
    pausePlayback: jest.Mock
    skipToNext: jest.Mock
    setPlaybackVolume: jest.Mock
  }

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    broadcastFn = (data: Partial<ServerMessage>) => {
      broadcastedMessages.push(data)
    }

    // Mock TokenManager
    ;(SpotifyTokenManager as unknown as jest.Mock).mockImplementation(() => ({
      getSdkAccessToken: jest.fn().mockReturnValue({
        access_token: 'test_access_token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token',
      }),
    }))

    // Mock SDK player
    mockSdkPlayer = {
      startResumePlayback: jest.fn().mockResolvedValue(undefined),
      pausePlayback: jest.fn().mockResolvedValue(undefined),
      skipToNext: jest.fn().mockResolvedValue(undefined),
      setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
    }
    ;(SpotifyApi.withAccessToken as jest.Mock).mockReturnValue({
      player: mockSdkPlayer,
    })

    // Initialize services that will be passed to the manager
    tabataTimer = new TabataTimer(broadcastFn as (msg: ServerMessage) => void)
    spotifyService = await SpotifyPolling.create(
      broadcastFn as (msg: ServerMessage) => void
    )

    // Initialize the socket manager with mocked services
    socketManager.initializeSocketManager(
      {} as any, // WebSocket server mock
      broadcastFn as (msg: ServerMessage) => void,
      tabataTimer,
      spotifyService
    )
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.cleanup()
  })

  describe('Timer Command Routing', () => {
    it('should route START command to TabataTimer', () => {
      const startSpy = jest.spyOn(tabataTimer, 'start')
      socketManager.handleTimerCommand({ type: 'TIMER_COMMAND', command: 'START' })
      expect(startSpy).toHaveBeenCalled()
    })

    it('should route PAUSE command to TabataTimer', () => {
      const pauseSpy = jest.spyOn(tabataTimer, 'pause')
      socketManager.handleTimerCommand({ type: 'TIMER_COMMAND', command: 'PAUSE' })
      expect(pauseSpy).toHaveBeenCalled()
    })

    it('should route STOP command to TabataTimer', () => {
      const stopSpy = jest.spyOn(tabataTimer, 'stop')
      socketManager.handleTimerCommand({ type: 'TIMER_COMMAND', command: 'STOP' })
      expect(stopSpy).toHaveBeenCalled()
    })

    it('should route TIMER_CONFIG and start the timer', () => {
      const startSpy = jest.spyOn(tabataTimer, 'start')
      const config = { workDuration: 45, restDuration: 15, totalCycles: 8 }
      socketManager.handleTimerConfig({ type: 'TIMER_CONFIG', ...config })
      socketManager.handleTimerCommand({ type: 'TIMER_COMMAND', command: 'START' })
      expect(startSpy).toHaveBeenCalledWith(config)
    })
  })

  describe('Spotify Command Routing', () => {
    it('should route PLAY command to SpotifyPolling service', async () => {
      await socketManager.handleSpotifyCommand({
        type: 'SPOTIFY_COMMAND',
        command: 'PLAY',
        deviceId: 'test_device',
      })
      expect(mockSdkPlayer.startResumePlayback).toHaveBeenCalledWith(
        'test_device',
        undefined,
        undefined
      )
    })

    it('should route SET_VOLUME command to SpotifyPolling service', async () => {
      await socketManager.handleSpotifyCommand({
        type: 'SPOTIFY_COMMAND',
        command: 'SET_VOLUME',
        deviceId: 'test_device',
        volume: 80,
      })
      expect(mockSdkPlayer.setPlaybackVolume).toHaveBeenCalledWith(
        80,
        'test_device'
      )
    })
  })

  describe('Cross-Service Command Coordination', () => {
    it('should trigger Spotify NEXT when a Tabata timer is started', () => {
      socketManager.handleTimerCommand({ type: 'TIMER_COMMAND', command: 'START' })
      expect(mockSdkPlayer.skipToNext).toHaveBeenCalled()
    })

    it('should trigger Spotify PAUSE when a Tabata timer is stopped', () => {
      socketManager.handleTimerCommand({ type: 'TIMER_COMMAND', command: 'STOP' })
      expect(mockSdkPlayer.pausePlayback).toHaveBeenCalled()
    })
  })
})
