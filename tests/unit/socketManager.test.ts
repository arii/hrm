/**
 * Unit tests for WebSocket manager (refactored with centralized client)
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'

const mockPlayer = {
  getCurrentlyPlayingTrack: jest.fn().mockResolvedValue(null),
  getAvailableDevices: jest.fn().mockResolvedValue({ devices: [] }),
  startResumePlayback: jest.fn().mockResolvedValue(undefined),
  pausePlayback: jest.fn().mockResolvedValue(undefined),
  skipToNext: jest.fn().mockResolvedValue(undefined),
  skipToPrevious: jest.fn().mockResolvedValue(undefined),
  transferPlayback: jest.fn().mockResolvedValue(undefined),
  setPlaybackVolume: jest.fn().mockResolvedValue(undefined),
}

const mockSdk = {
  player: mockPlayer,
}

jest.mock('../../services/spotifyClient', () => ({
  spotifyClient: {
    getSdk: jest.fn().mockResolvedValue(mockSdk),
    executeCommand: jest.fn(async (action, _commandName) => {
      try {
        await action(mockSdk as any)
        return true
      } catch (e) {
        return false
      }
    }),
  },
}))
import { SpotifyPolling } from '../../services/spotifyPolling'
import TabataTimer from '../../services/tabataTimer'
import { ServerMessage } from '../../types/websocket'
import { spotifyClient } from '../../services/spotifyClient'

// Mock the logger
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}))

describe('WebSocket Manager Integration (Refactored)', () => {
  let tabataTimer: TabataTimer
  let spotifyService: SpotifyPolling
  let broadcastedMessages: Partial<ServerMessage>[]
  let broadcastFn: (data: Partial<ServerMessage>) => void

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.clearAllMocks()
    broadcastedMessages = []

    broadcastFn = (data: Partial<ServerMessage>) => {
      broadcastedMessages.push(data)
    }

    tabataTimer = new TabataTimer(broadcastFn)
    spotifyService = await SpotifyPolling.create(broadcastFn)
  })

  afterEach(() => {
    jest.useRealTimers()
    spotifyService.stopPolling()
  })

  it('should allow timer and Spotify commands independently', async () => {
    tabataTimer.handleCommand('START')
    await spotifyService.handleCommand('PLAY', 'test_device_id')

    const timerState = tabataTimer.getState()
    expect(timerState.isRunning).toBe(true)

    expect(spotifyClient.executeCommand).toHaveBeenCalledWith(expect.any(Function), 'PLAY')
    expect(mockPlayer.startResumePlayback).toHaveBeenCalledWith('test_device_id', undefined)
  })

  it('should support timer start with Spotify skip command', async () => {
    tabataTimer.handleCommand('START')
    await spotifyService.handleCommand('NEXT', 'test_device_id')

    const timerState = tabataTimer.getState()
    expect(timerState.isRunning).toBe(true)

    expect(spotifyClient.executeCommand).toHaveBeenCalledWith(expect.any(Function), 'NEXT')
    expect(mockPlayer.skipToNext).toHaveBeenCalledWith('test_device_id')
  })

  it('should support timer stop with Spotify pause command', async () => {
    tabataTimer.handleCommand('START')
    jest.advanceTimersByTime(2000)
    tabataTimer.handleCommand('STOP')
    await spotifyService.handleCommand('PAUSE', 'test_device_id')

    const timerState = tabataTimer.getState()
    expect(timerState.isRunning).toBe(false)

    expect(spotifyClient.executeCommand).toHaveBeenCalledWith(expect.any(Function), 'PAUSE')
    expect(mockPlayer.pausePlayback).toHaveBeenCalledWith('test_device_id')
  })
})
