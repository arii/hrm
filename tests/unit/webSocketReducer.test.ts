/**
 * @jest-environment jsdom
 */
import {
  reducer,
  INITIAL_STATE,
  WebSocketState,
  HrmData,
} from '../../context/webSocketReducer'
import { ServerMessage } from '../../types/websocket'
import { HrmStreamData as ServerHrmData } from '../../types/core'

describe('webSocketReducer', () => {
  // Helper to create mock users and reduce duplication
  // uses "as any" to allow extra properties like percentage/zone/restingHr
  // which appear in tests but might be missing from the strict HrmData type
  const createMockUser = (overrides: Record<string, any> = {}): HrmData =>
    ({
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
    } as unknown as HrmData)

  const baseUser = createMockUser()

  it('should return the initial state if no action is matched', () => {
    const action = { type: 'UNKNOWN_ACTION' } as unknown as ServerMessage
    const state = reducer(INITIAL_STATE, action)
    expect(state).toEqual(INITIAL_STATE)
  })

  it('should handle RESET_STATE action', () => {
    const currentState: WebSocketState = {
      ...INITIAL_STATE,
      hrmData: [baseUser],
    }
    const state = reducer(currentState, { type: 'RESET_STATE' })
    expect(state).toEqual(INITIAL_STATE)
  })

  describe('INITIAL_STATE action', () => {
    it('should handle INITIAL_STATE action and mark hrmData as connected', () => {
      const serverState = {
        hrmData: [
          createMockUser({
            value: 120,
            percentage: 60,
            calories: 100,
          }),
        ] as ServerHrmData[],
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
    it('should handle HRM_UPDATE by merging new data with existing state', () => {
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          createMockUser({
            value: 120,
            percentage: 60,
            lastUpdated: 1000,
          }),
        ],
      }

      const payload: ServerHrmData[] = [
        createMockUser({
          value: 125,
          percentage: 65,
          zone: 2,
          updatedAt: 2000,
          calories: 105,
        }),
      ]

      const message: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: payload,
      }

      const newState = reducer(initialState, message)

      expect(newState.hrmData).toHaveLength(1)
      expect(newState.hrmData[0]).toEqual(
        expect.objectContaining({
          clientId: 'client-1',
          value: 125,
          percentage: 65,
          zone: 2,
          updatedAt: 2000,
          isConnected: true,
        })
      )
      expect(newState.hrmData[0].lastUpdated).toBeGreaterThan(1000)
    })

    it('should handle HRM_UPDATE by adding new clients', () => {
      const initialState: WebSocketState = { ...INITIAL_STATE, hrmData: [] }

      const payload: ServerHrmData[] = [
        createMockUser({
          clientId: 'client-2',
          value: 140,
          percentage: 75,
          zone: 3,
          updatedAt: 3000,
          calories: 50,
        }),
      ]

      const message: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: payload,
      }

      const newState = reducer(initialState, message)

      expect(newState.hrmData).toHaveLength(1)
      expect(newState.hrmData[0]).toEqual(
        expect.objectContaining({
          clientId: 'client-2',
          value: 140,
          isConnected: true,
        })
      )
    })

    it('should handle HRM_UPDATE by removing clients not present in the payload', () => {
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          createMockUser({
            clientId: 'client-toremove',
            lastUpdated: 1000,
          }),
        ],
      }

      const payload: ServerHrmData[] = [
        createMockUser({
          clientId: 'client-new',
          value: 140,
          percentage: 75,
          zone: 3,
          updatedAt: 3000,
          calories: 50,
        }),
      ]

      const message: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: payload,
      }

      const newState = reducer(initialState, message)

      expect(newState.hrmData).toHaveLength(1)
      expect(newState.hrmData[0].clientId).toBe('client-new')
      expect(
        newState.hrmData.find((c) => c.clientId === 'client-toremove')
      ).toBeUndefined()
    })

    it('should preserve existing client state properties not present in payload if merging', () => {
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [
          createMockUser({
            name: 'Existing Name',
            lastUpdated: 1000,
          }),
        ],
      }

      // We want to simulate a payload that does NOT have 'name', so we delete it.
      const payloadItem = createMockUser({
        value: 125,
        percentage: 65,
        zone: 2,
        updatedAt: 2000,
        calories: 105,
      })
      delete (payloadItem as any).name

      const payload: ServerHrmData[] = [payloadItem]

      const message: ServerMessage = {
        type: 'HRM_UPDATE',
        payload: payload,
      }

      const newState = reducer(initialState, message)

      expect(newState.hrmData[0].name).toBe('Existing Name')
      expect(newState.hrmData[0].value).toBe(125)
    })
  })

  describe('DEVICE_OFFLINE action', () => {
    it('should remove the specified device from the state', () => {
      const user2 = createMockUser({ clientId: 'client-2', name: 'User B' })
      const initialState: WebSocketState = {
        ...INITIAL_STATE,
        hrmData: [baseUser, user2],
      }
      const action: ServerMessage = {
        type: 'DEVICE_OFFLINE',
        payload: { deviceId: 'client-1' },
      }
      const state = reducer(initialState, action)
      expect(state.hrmData).toHaveLength(1)
      expect(
        state.hrmData.find((d) => d.clientId === 'client-1')
      ).toBeUndefined()
      expect(state.hrmData[0].clientId).toBe('client-2')
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
