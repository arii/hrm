/**
 * @jest-environment jsdom
 */
import { reducer, INITIAL_STATE, HrmData } from '../../context/webSocketReducer'
import {
  InitialStateSnapshotPayload,
  ServerMessage,
} from '../../types/websocket'
import { HrmStreamData as ServerHrmData } from '../../types/core'

interface TestHrmData extends HrmData {
  percentage?: number
  zone?: number
  restingHr?: number
}

describe('webSocketReducer', () => {
  const createMockUser = (
    overrides: Partial<TestHrmData> = {}
  ): TestHrmData => ({
    clientId: 'client-1',
    name: 'User A',
    age: 30,
    maxHr: 190,
    restingHr: 60,
    value: 100,
    percentage: 50,
    zone: 1,
    calories: 10,
    isConnected: true,
    updatedAt: 1000,
    ...overrides,
  })

  it('should return initial state for unknown action', () => {
    const action = { type: 'UNKNOWN' } as unknown as ServerMessage
    expect(reducer(INITIAL_STATE, action)).toEqual(INITIAL_STATE)
  })

  it('should handle RESET_STATE', () => {
    const state = { ...INITIAL_STATE, hrmData: [createMockUser()] }
    expect(reducer(state, { type: 'RESET_STATE' })).toEqual(INITIAL_STATE)
  })

  describe('Simple State Updates', () => {
    test.each([
      [
        'TIMER_UPDATE',
        'timerData',
        { timeRemaining: 20, isRunning: true },
        { ...INITIAL_STATE.timerData, timeRemaining: 20, isRunning: true },
      ],
      [
        'SPOTIFY_UPDATE',
        'spotifyData',
        { trackName: 'New Song', isPlaying: true },
        {
          ...INITIAL_STATE.spotifyData,
          trackName: 'New Song',
          isPlaying: true,
        },
      ],
      [
        'ACTIVE_ALERTS_UPDATE',
        'activeAlerts',
        [{ code: 'HRM_STALE' }],
        [{ code: 'HRM_STALE' }],
      ],
      ['SPOTIFY_SERVICE_INIT_UPDATE', 'spotifyServiceInitialized', true, true],
    ])('should handle %s', (type, key, payload, expected) => {
      const action = { type, payload } as unknown as ServerMessage
      const state = reducer(INITIAL_STATE, action)
      // @ts-expect-error: mocking dynamic key access for test brevity
      expect(state[key]).toEqual(expected)
    })
  })

  describe('Complex Actions', () => {
    it('should handle INITIAL_STATE', () => {
      const payload: InitialStateSnapshotPayload = {
        hrmData: [createMockUser({ value: 120 })],
        timerData: { ...INITIAL_STATE.timerData, isRunning: true },
        spotifyData: { ...INITIAL_STATE.spotifyData, trackName: 'Test' },
      }
      const state = reducer(INITIAL_STATE, {
        type: 'INITIAL_STATE',
        payload,
      })

      expect(state.hrmData[0].isConnected).toBe(true)
      expect(state.timerData.isRunning).toBe(true)
      expect(state.spotifyData.trackName).toBe('Test')
    })

    it('should handle DEVICE_OFFLINE', () => {
      const state = {
        ...INITIAL_STATE,
        hrmData: [createMockUser(), createMockUser({ clientId: 'client-2' })],
      }
      const newState = reducer(state, {
        type: 'DEVICE_OFFLINE',
        payload: { deviceId: 'client-1' },
      })
      expect(newState.hrmData).toHaveLength(1)
      expect(newState.hrmData[0].clientId).toBe('client-2')
    })
  })

  describe('HRM_UPDATE Logic', () => {
    it('should merge, add, and remove clients correctly', () => {
      const initialState = {
        ...INITIAL_STATE,
        hrmData: [
          createMockUser({ clientId: 'c1', value: 100, name: 'Keep Me' }),
          createMockUser({ clientId: 'c2', value: 100 }), // To be removed
        ],
      }

      // Simulate partial update for c1 (server might not send name)
      const c1Payload = createMockUser({ clientId: 'c1', value: 110 })
      delete c1Payload.name

      const payload: ServerHrmData[] = [
        c1Payload, // Update
        createMockUser({ clientId: 'c3', value: 120 }), // Add
      ]

      const state = reducer(initialState, {
        type: 'HRM_UPDATE',
        payload,
      })

      expect(state.hrmData).toHaveLength(2)

      // Check Update + Merge (name preserved)
      const c1 = state.hrmData.find((d) => d.clientId === 'c1')
      expect(c1).toBeDefined()
      expect(c1!).toMatchObject({
        value: 110,
        name: 'Keep Me',
        isConnected: true,
      })
      expect(c1!.lastUpdated).toBeGreaterThan(0)

      // Check Add
      const c3 = state.hrmData.find((d) => d.clientId === 'c3')
      expect(c3).toBeDefined()
      expect(c3!).toMatchObject({ value: 120, isConnected: true })

      // Check Remove
      expect(state.hrmData.find((d) => d.clientId === 'c2')).toBeUndefined()
    })
  })
})
