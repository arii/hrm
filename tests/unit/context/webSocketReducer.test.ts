/**
 * @jest-environment jsdom
 */
import {
  reducer,
  INITIAL_STATE,
  WebSocketState,
  HrmData,
} from '../../../context/webSocketReducer'
import {
  ServerMessage,
  InitialStateSnapshotPayload,
  SpotifyData as SpotifyDataType,
} from '../../../types/websocket'
import { HrmStreamData } from '../../../types/core'

describe('webSocketReducer', () => {
  const baseUser: HrmData = {
    clientId: '1',
    name: 'User A',
    age: 30,
    maxHr: 190,
    restingHr: 60,
    value: 100,
    zone: 'warmup',
    calories: 10,
    isConnected: true,
    updatedAt: 1000000,
  }

  it('should return the initial state if no action is matched', () => {
    // This is an unconventional action to test the default case.
    const action = { type: 'UNKNOWN_ACTION' } as unknown as ServerMessage
    const state = reducer(INITIAL_STATE, action)
    expect(state).toEqual(INITIAL_STATE)
  })

  it('should handle RESET_STATE action', () => {
    const currentState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          name: 'Test',
          age: 30,
          maxHr: 190,
          restingHr: 60,
          value: 120,
          zone: 'aerobic',
          calories: 100,
          isConnected: true,
        },
      ],
    }
    const action = { type: 'RESET_STATE' }
    const state = reducer(currentState, action)
    expect(state).toEqual(INITIAL_STATE)
  })

  describe('INITIAL_STATE action', () => {
    it('should handle INITIAL_STATE action and mark hrmData as connected', () => {
      const serverState = {
        hrmData: [
          {
            clientId: '1',
            name: 'Test',
            age: 30,
            maxHr: 190,
            restingHr: 60,
            value: 120,
            zone: 'aerobic',
            calories: 100,
            updatedAt: 1000000,
          },
        ] as HrmStreamData[],
        timerData: {
          ...INITIAL_STATE.timerData,
          isRunning: true,
        },
        spotifyData: {
          ...INITIAL_STATE.spotifyData,
          playback: {
            ...INITIAL_STATE.spotifyData.playback,
            track: {
              ...INITIAL_STATE.spotifyData.playback.track,
              name: 'Test Track',
            },
          },
        },
      }

      const action: ServerMessage = {
        type: 'INITIAL_STATE',
        payload: serverState as unknown as InitialStateSnapshotPayload,
      }
      const state = reducer(INITIAL_STATE, action)

      expect(state.hrmData[0].isConnected).toBe(true)
      expect(state.timerData.isRunning).toBe(true)
      expect(state.spotifyData.playback.track.name).toBe('Test Track')
    })
  })

  describe('HRM_UPDATE action', () => {
    it('should add a new user with a lastUpdated timestamp', () => {
      const action: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: [baseUser],
      }
      const state = reducer(INITIAL_STATE, action)
      expect(state.hrmData).toHaveLength(1)
      expect(state.hrmData[0]).toEqual(
        expect.objectContaining({ ...baseUser, isConnected: true })
      )
      expect(state.hrmData[0].lastUpdated).toBeDefined()
    })

    it('should update an existing user and their lastUpdated timestamp', () => {
      const mockNow = 1234567890
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(mockNow)

      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [{ ...baseUser, isConnected: true, lastUpdated: 12345 }],
      }
      const updatedUser = {
        ...baseUser,
        value: 150,
        zone: 'aerobic',
        updatedAt: 2000000,
      }
      const action: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: [updatedUser],
      }
      const state = reducer(initialState, action)
      expect(state.hrmData).toHaveLength(1)
      expect(state.hrmData[0].value).toBe(150)
      expect(state.hrmData[0].zone).toBe('aerobic')
      expect(state.hrmData[0].isConnected).toBe(true)
      expect(state.hrmData[0].lastUpdated).toBe(mockNow)

      dateSpy.mockRestore()
    })

    it('should remove users that are not in the payload immediately', () => {
      const now = Date.now()
      const staleUser = {
        ...baseUser,
        clientId: '2',
        name: 'Stale User',
      }
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          { ...baseUser, isConnected: true, lastUpdated: now },
          { ...staleUser, isConnected: true, lastUpdated: now },
        ],
      }
      const action: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: [baseUser],
      }
      const state = reducer(initialState, action)
      expect(state.hrmData).toHaveLength(1)
      expect(state.hrmData.find((d) => d.clientId === '2')).toBeUndefined()
      expect(state.hrmData[0].clientId).toBe('1')
    })
  })

  describe('DEVICE_OFFLINE action', () => {
    it('should remove the specified device from the state', () => {
      const user2 = { ...baseUser, clientId: '2', name: 'User B' }
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          { ...baseUser, isConnected: true },
          { ...user2, isConnected: true },
        ],
      }
      const action: ServerMessage = {
        type: 'DEVICE_OFFLINE',
        payload: { deviceId: '1' },
      }
      const state = reducer(initialState, action)
      expect(state.hrmData).toHaveLength(1)
      expect(state.hrmData.find((d) => d.clientId === '1')).toBeUndefined()
      expect(state.hrmData[0].clientId).toBe('2')
    })
  })

  it('should handle TIMER_UPDATE action', () => {
    const payload = { timeRemaining: 20, isRunning: true }
    const action: ServerMessage = { type: 'TIMER_UPDATE', payload }
    const state = reducer(INITIAL_STATE, action)
    expect(state.timerData.timeRemaining).toBe(20)
    expect(state.timerData.isRunning).toBe(true)
  })

  it('should handle SPOTIFY_UPDATE action', () => {
    const payload = {
      playback: {
        track: { name: 'New Song' },
        is_playing: true,
      },
    }
    const action: ServerMessage = {
      type: 'SPOTIFY_UPDATE',
      payload: payload as unknown as SpotifyDataType,
    }
    const state = reducer(INITIAL_STATE, action)
    expect(state.spotifyData.playback.track.name).toBe('New Song')
    expect(state.spotifyData.playback.is_playing).toBe(true)
  })
})
