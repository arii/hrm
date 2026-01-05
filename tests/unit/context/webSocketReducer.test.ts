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
    it('should handle INITIAL_STATE action and mark hrmData as connected', () => {
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

    it('should add a new user', () => {
      const action: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: [baseUser],
      }
      const state = reducer(INITIAL_STATE, action)
      expect(state.hrmData).toHaveLength(1)
      expect(state.hrmData[0]).toEqual({ ...baseUser, isConnected: true })
    })

    it('should update an existing user and keep them connected', () => {
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [{ ...baseUser, isConnected: true }],
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
    })

    it('should remove a user if they are not in the payload', () => {
      const user2 = { ...baseUser, clientId: '2', userName: 'User B' }
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          { ...baseUser, isConnected: true },
          { ...user2, isConnected: true },
        ],
      }
      const action: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: [baseUser], // Only user 1 is in the update
      }
      const state = reducer(initialState, action)
      expect(state.hrmData).toHaveLength(1)
      const updatedUser1 = state.hrmData.find((u) => u.clientId === '1')
      const updatedUser2 = state.hrmData.find((u) => u.clientId === '2')
      expect(updatedUser1).toBeDefined()
      expect(updatedUser1?.isConnected).toBe(true)
      expect(updatedUser2).toBeUndefined()
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
    const payload = { trackName: 'New Song', isPlaying: true }
    const action: ServerMessage = { type: 'SPOTIFY_UPDATE', payload }
    const state = reducer(INITIAL_STATE, action)
    expect(state.spotifyData.trackName).toBe('New Song')
    expect(state.spotifyData.isPlaying).toBe(true)
  })
})
