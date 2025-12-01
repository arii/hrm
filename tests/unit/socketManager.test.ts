// tests/unit/socketManager.test.ts
import { WebSocket } from 'ws'
import { initSocketManager, handleIncomingMessage } from '@/utils/socketManager'
import TabataTimer from '@/services/tabataTimer'
import { SpotifyPolling } from '@/services/spotifyPolling'
import { Server as WebSocketServer } from 'ws'

// Mock services
jest.mock('@/services/tabataTimer')
jest.mock('@/services/spotifyPolling')
jest.mock('ws')

const mockedTabataTimer = TabataTimer as jest.MockedClass<typeof TabataTimer>
const mockedSpotifyPolling = SpotifyPolling as jest.MockedClass<
  typeof SpotifyPolling
>

describe('WebSocket Manager', () => {
  let ws: WebSocket
  let tabataService: TabataTimer
  let spotifyService: SpotifyPolling

  beforeEach(() => {
    ws = new WebSocket('')
    tabataService = new mockedTabataTimer(
      {} as unknown as (message: import('../../types/websocket').ServerMessage) => void
    )
    spotifyService = new mockedSpotifyPolling(
      {} as unknown as (message: import('../../types/websocket').ServerMessage) => void
    )

    const getSnapshot = () => ({
      timerData: {
        isRunning: false,
        currentPhase: 'IDLE',
        timeRemaining: 0,
        timeElapsed: 0,
        mode: 'TABATA',
        workDuration: 20,
        restDuration: 10,
        soundEventId: 0,
      },
      spotifyData: {
        trackName: 'Test Track',
        artist: 'Test Artist',
        albumArt: '',
        isPlaying: false,
      },
    })
    // We still need to call init to set up the service instances
    initSocketManager(
      new WebSocketServer(),
      { tabataService, spotifyService },
      getSnapshot
    )
  })

  it('should handle TIMER_COMMAND messages', () => {
    const message = JSON.stringify({
      type: 'TIMER_COMMAND',
      command: 'START',
    })
    handleIncomingMessage(ws, message, 'test-client')
    expect(tabataService.handleCommand).toHaveBeenCalledWith('START')
  })

  it('should handle SET_MODE messages', () => {
    const message = JSON.stringify({
      type: 'SET_MODE',
      mode: 'STOPWATCH',
    })
    handleIncomingMessage(ws, message, 'test-client')
    expect(tabataService.setMode).toHaveBeenCalledWith('STOPWATCH')
  })

  it('should handle TIMER_CONFIG messages', () => {
    const message = JSON.stringify({
      type: 'TIMER_CONFIG',
      workDuration: 30,
      restDuration: 15,
    })
    handleIncomingMessage(ws, message, 'test-client')
    expect(tabataService.setConfig).toHaveBeenCalledWith({
      workDuration: 30,
      restDuration: 15,
    })
  })

  it('should handle SPOTIFY_COMMAND messages', () => {
    const message = JSON.stringify({
      type: 'SPOTIFY_COMMAND',
      command: 'PLAY',
      deviceId: 'test-device',
    })
    handleIncomingMessage(ws, message, 'test-client')
    expect(spotifyService.handleCommand).toHaveBeenCalledWith(
      'PLAY',
      'test-device',
      undefined,
      undefined
    )
  })
})
