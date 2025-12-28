/**
 * @jest-environment jsdom
 */
import {
  reducer,
  INITIAL_STATE,
} from '../../../context/WebSocketContext'
import { ServerHrmData } from '../../../types/core'
import { ServerMessage } from '../../../types/websocket'
import { WebSocketState } from '../../../context/WebSocketContext'

describe('WebSocketContext reducer', () => {
  it('should handle INITIAL_STATE', () => {
    const initialStateAction: ServerMessage = {
      type: 'INITIAL_STATE',
      payload: {
        hrmData: [
          { clientId: '1', name: 'Test User', value: 120, maxHr: 190 },
        ],
        timerData: {
          isRunning: true,
          currentPhase: 'WORK',
          timeRemaining: 20,
        },
        spotifyData: { isPlaying: true, trackName: 'Test Track' },
        activeAlerts: [],
        spotifyServiceInitialized: true,
      },
    }

    const expectedState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'Test User',
          value: 120,
          maxHr: 190,
          isConnected: true,
        },
      ],
      timerData: {
        ...INITIAL_STATE.timerData,
        isRunning: true,
        currentPhase: 'WORK',
        timeRemaining: 20,
      },
      spotifyData: {
        ...INITIAL_STATE.spotifyData,
        isPlaying: true,
        trackName: 'Test Track',
      },
      activeAlerts: [],
      spotifyServiceInitialized: true,
    }

    expect(reducer(INITIAL_STATE, initialStateAction)).toEqual(expectedState)
  })

  it('should handle HRM_UPDATE', () => {
    const initialState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'User 1',
          value: 100,
          maxHr: 180,
          isConnected: true,
        },
        {
          clientId: '2',
          name: 'User 2',
          value: 110,
          maxHr: 190,
          isConnected: true,
        },
      ],
    }

    const hrmUpdateAction: ServerMessage = {
      type: 'HRM_UPDATE',
      payload: [
        { clientId: '1', name: 'User 1', value: 105, maxHr: 180 },
        { clientId: '3', name: 'User 3', value: 120, maxHr: 200 },
      ],
    }

    const expectedState: WebSocketState = {
      ...initialState,
      hrmData: [
        {
          clientId: '1',
          name: 'User 1',
          value: 105,
          maxHr: 180,
          isConnected: true,
        },
        {
          clientId: '2',
          name: 'User 2',
          value: 110,
          maxHr: 190,
          isConnected: false,
        },
        {
          clientId: '3',
          name: 'User 3',
          value: 120,
          maxHr: 200,
          isConnected: true,
        },
      ],
    }

    expect(reducer(initialState, hrmUpdateAction)).toEqual(expectedState)
  })

  it('should handle TIMER_UPDATE', () => {
    const timerUpdateAction: ServerMessage = {
      type: 'TIMER_UPDATE',
      payload: { timeRemaining: 15 },
    }

    const expectedState: WebSocketState = {
      ...INITIAL_STATE,
      timerData: {
        ...INITIAL_STATE.timerData,
        timeRemaining: 15,
      },
    }

    expect(reducer(INITIAL_STATE, timerUpdateAction)).toEqual(expectedState)
  })

  it('should handle SPOTIFY_UPDATE', () => {
    const spotifyUpdateAction: ServerMessage = {
      type: 'SPOTIFY_UPDATE',
      payload: { isPlaying: false, artist: 'Test Artist' },
    }

    const expectedState: WebSocketState = {
      ...INITIAL_STATE,
      spotifyData: {
        ...INITIAL_STATE.spotifyData,
        isPlaying: false,
        artist: 'Test Artist',
      },
    }

    expect(reducer(INITIAL_STATE, spotifyUpdateAction)).toEqual(expectedState)
  })

  it('should return current state for unknown action types', () => {
    const unknownAction = { type: 'UNKNOWN_ACTION' } as any
    expect(reducer(INITIAL_STATE, unknownAction)).toEqual(INITIAL_STATE)
  })
})
