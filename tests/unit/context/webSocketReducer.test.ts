/**
 * @jest-environment jsdom
 */
import {
  reducer,
  INITIAL_STATE,
  WebSocketState,
} from '../../../context/webSocketReducer'
import { ServerMessage } from '../../../types/websocket'
import { HrmStreamData } from '../../../types/core'

describe('webSocketReducer', () => {
  const baseUser: HrmStreamData = {
    clientId: '1',
    userName: 'User A',
    userAge: 30,
    maxHr: 190,
    restingHr: 60,
    hrm: 100,
    zone: 'warmup',
    calories: 10,
  }

  it('returns the initial state if no action is matched', () => {
    const action = { type: 'UNKNOWN_ACTION' } as unknown as ServerMessage
    const state = reducer(INITIAL_STATE, action)
    expect(state).toEqual(INITIAL_STATE)
  })

  it('handles RESET_STATE action', () => {
    const currentState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [
        {
          clientId: '1',
          userName: 'Test',
          userAge: 30,
          maxHr: 190,
          restingHr: 60,
          hrm: 120,
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
    it('handles INITIAL_STATE action and marks hrmData as connected', () => {
      const serverState = {
        hrmData: [
          {
            clientId: '1',
            userName: 'Test',
            userAge: 30,
            maxHr: 190,
            restingHr: 60,
            hrm: 120,
            zone: 'aerobic',
            calories: 100,
          },
        ] as HrmStreamData[],
        timerData: {
          ...INITIAL_STATE.timerData,
          isRunning: true,
        },
        spotifyData: {
          ...INITIAL_STATE.spotifyData,
          trackName: 'Test Track',
        },
      }

      const action: ServerMessage = {
        type: 'INITIAL_STATE',
        payload: serverState,
      }
      const state = reducer(INITIAL_STATE, action)

      expect(state.hrmData[0].isConnected).toBe(true)
      expect(state.timerData.isRunning).toBe(true)
      expect(state.spotifyData.trackName).toBe('Test Track')
    })
  })

  describe('HRM_UPDATE action', () => {
    it('adds a new user with a lastUpdated timestamp', () => {
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

    it('updates an existing user and their lastUpdated timestamp', () => {
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [{ ...baseUser, isConnected: true, lastUpdated: 12345 }],
      }
      const updatedUser = { ...baseUser, hrm: 150, zone: 'aerobic' }
      const action: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: [updatedUser],
      }
      const state = reducer(initialState, action)
      expect(state.hrmData).toHaveLength(1)
      expect(state.hrmData[0].hrm).toBe(150)
      expect(state.hrmData[0].zone).toBe('aerobic')
      expect(state.hrmData[0].isConnected).toBe(true)
      expect(state.hrmData[0].lastUpdated).not.toBe(12345)
    })

    it('removes users that have not been updated in the last 3 minutes', () => {
      const now = Date.now()
      const staleUser = {
        ...baseUser,
        clientId: '2',
        userName: 'Stale User',
      }
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          { ...baseUser, isConnected: true, lastUpdated: now },
          { ...staleUser, isConnected: true, lastUpdated: now - 180001 },
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
    it('removes the specified device from the state', () => {
      const user2 = { ...baseUser, clientId: '2', userName: 'User B' }
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

  it('handles TIMER_UPDATE action', () => {
    const payload = { timeRemaining: 20, isRunning: true }
    const action: ServerMessage = { type: 'TIMER_UPDATE', payload }
    const state = reducer(INITIAL_STATE, action)
    expect(state.timerData.timeRemaining).toBe(20)
    expect(state.timerData.isRunning).toBe(true)
  })

  it('handles SPOTIFY_UPDATE action', () => {
    const payload = { trackName: 'New Song', isPlaying: true }
    const action: ServerMessage = { type: 'SPOTIFY_UPDATE', payload }
    const state = reducer(INITIAL_STATE, action)
    expect(state.spotifyData.trackName).toBe('New Song')
    expect(state.spotifyData.isPlaying).toBe(true)
  })
})
